/**
 * Data Migration Utility
 * Transforms old export format (v2.0) to new format (v3.0)
 *
 * Old: Flat array of items grouped by status in JavaScript
 * New: Pre-grouped arrays by status in Firebase structure
 */

/**
 * Transform old export format to new format
 * @param {Object} oldExport - Old format JSON (v2.0)
 * @returns {Object} New format JSON (v3.0)
 */
export function transformExportData(oldExport) {
  if (!oldExport || !oldExport.mediaTypes) {
    throw new Error('Invalid export data: missing mediaTypes');
  }

  // Validate version
  if (oldExport.version !== '2.0') {
    throw new Error(`Unsupported export version: ${oldExport.version}. Expected 2.0`);
  }

  const newExport = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    userEmail: oldExport.userEmail,
    data: {
      metadata: {},
      lists: {}
    },
    settings: oldExport.settings || {}
  };

  // Define status lists for each media type
  const statusLists = {
    game: ['upcoming', 'willplay', 'playing', 'completed', 'paused', 'dropped'],
    movie: ['upcoming', 'willwatch', 'watching', 'completed', 'paused', 'dropped'],
    book: ['upcoming', 'willread', 'reading', 'completed', 'paused', 'dropped']
  };

  // Category name mappings
  const categoryNames = {
    game: 'platforms',
    movie: 'genres',
    book: 'authors'
  };

  // Transform each media type
  for (const [mediaType, oldData] of Object.entries(oldExport.mediaTypes)) {
    if (!oldData || !oldData.items) {
      console.warn(`Skipping ${mediaType}: no items data`);
      continue;
    }

    // Store categories in metadata
    const categoryName = categoryNames[mediaType];
    if (categoryName && oldData.categories && oldData.categories.length > 0) {
      newExport.data.metadata[categoryName] = oldData.categories;
    } else {
      newExport.data.metadata[categoryName] = [];
    }

    // Create notes map for quick lookup: itemId -> [notes]
    const notesMap = {};
    if (oldData.notes && Array.isArray(oldData.notes)) {
      for (const note of oldData.notes) {
        if (!notesMap[note.itemId]) {
          notesMap[note.itemId] = [];
        }
        notesMap[note.itemId].push({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          userId: note.userId
        });
      }
    }

    // Initialize status lists for this media type
    const statusList = statusLists[mediaType] || [];
    const mediaTypeLists = {};

    for (const status of statusList) {
      mediaTypeLists[status] = [];
    }

    // Group items by status
    for (const item of oldData.items) {
      const status = item.status;

      if (!statusList.includes(status)) {
        console.warn(`Unknown status "${status}" for ${mediaType}. Skipping item: ${item.title}`);
        continue;
      }

      // Transform item and attach notes
      const transformedItem = {
        id: item.id,
        title: item.title,
        platform: item.platform || item.genre || item.author, // Handle different media types
        platformColor: item.platformColor || item.genreColor || item.authorColor,
        favorite: item.favorite || false,
        order: item.order !== undefined ? item.order : 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userId: item.userId,
        notes: notesMap[item.id] || []
      };

      // Add optional fields if they exist
      if (item.completionDate !== undefined && item.completionDate !== null) {
        transformedItem.completionDate = item.completionDate;
      }

      mediaTypeLists[status].push(transformedItem);
    }

    // Add to new structure
    newExport.data.lists[mediaType] = mediaTypeLists;
  }

  return newExport;
}

/**
 * Validate transformed data
 * @param {Object} newExport - New format JSON (v3.0)
 * @returns {Object} Validation report
 */
export function validateTransformedData(newExport) {
  const report = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {}
  };

  // Check version
  if (newExport.version !== '3.0') {
    report.errors.push(`Invalid version: ${newExport.version} (expected 3.0)`);
    report.isValid = false;
  }

  // Check structure
  if (!newExport.data || !newExport.data.metadata || !newExport.data.lists) {
    report.errors.push('Missing required structure: data.metadata or data.lists');
    report.isValid = false;
    return report;
  }

  // Validate each media type
  const mediaTypes = ['game', 'movie', 'book'];
  let totalItems = 0;
  let totalCategories = 0;
  let totalNotes = 0;

  for (const mediaType of mediaTypes) {
    const lists = newExport.data.lists[mediaType];
    if (!lists) continue;

    report.summary[mediaType] = {
      items: 0,
      byStatus: {},
      notes: 0,
      categories: 0
    };

    // Count items by status
    for (const [status, items] of Object.entries(lists)) {
      if (!Array.isArray(items)) {
        report.errors.push(`${mediaType}.${status} is not an array`);
        report.isValid = false;
        continue;
      }

      const count = items.length;
      report.summary[mediaType].byStatus[status] = count;
      report.summary[mediaType].items += count;
      totalItems += count;

      // Validate items
      for (const item of items) {
        if (!item.id || !item.title) {
          report.errors.push(`Invalid item in ${mediaType}.${status}: missing id or title`);
          report.isValid = false;
        }

        // Count notes
        if (item.notes && Array.isArray(item.notes)) {
          report.summary[mediaType].notes += item.notes.length;
          totalNotes += item.notes.length;
        }
      }
    }

    // Check categories
    const categoryName = {
      game: 'platforms',
      movie: 'genres',
      book: 'authors'
    }[mediaType];

    const categories = newExport.data.metadata[categoryName];
    if (categories && Array.isArray(categories)) {
      report.summary[mediaType].categories = categories.length;
      totalCategories += categories.length;

      // Validate categories
      for (const category of categories) {
        if (!category.id || !category.name) {
          report.errors.push(`Invalid category in ${categoryName}: missing id or name`);
          report.isValid = false;
        }
      }
    }
  }

  // Overall summary
  report.totals = {
    items: totalItems,
    categories: totalCategories,
    notes: totalNotes
  };

  return report;
}

/**
 * Compare old and new exports for data loss
 * @param {Object} oldExport - Old format (v2.0)
 * @param {Object} newExport - New format (v3.0)
 * @returns {Object} Comparison report
 */
export function compareExports(oldExport, newExport) {
  const report = {
    dataPreserved: true,
    differences: [],
    itemCounts: {},
    categoryCount: {}
  };

  // Count old items
  let oldItemCount = 0;
  let oldCategoryCount = 0;
  let oldNoteCount = 0;

  for (const [mediaType, data] of Object.entries(oldExport.mediaTypes || {})) {
    if (data.items) oldItemCount += data.items.length;
    if (data.categories) oldCategoryCount += data.categories.length;
    if (data.notes) oldNoteCount += data.notes.length;

    report.itemCounts[mediaType] = {
      old: data.items?.length || 0,
      new: 0
    };
    report.categoryCount[mediaType] = {
      old: data.categories?.length || 0,
      new: 0
    };
  }

  // Count new items
  let newItemCount = 0;
  let newCategoryCount = 0;
  let newNoteCount = 0;

  for (const [mediaType, lists] of Object.entries(newExport.data.lists || {})) {
    let typeItemCount = 0;
    let typeNoteCount = 0;

    for (const items of Object.values(lists)) {
      if (Array.isArray(items)) {
        typeItemCount += items.length;
        for (const item of items) {
          if (item.notes) typeNoteCount += item.notes.length;
        }
      }
    }

    newItemCount += typeItemCount;
    newNoteCount += typeNoteCount;

    if (report.itemCounts[mediaType]) {
      report.itemCounts[mediaType].new = typeItemCount;
    }
  }

  for (const [categoryName, categories] of Object.entries(newExport.data.metadata || {})) {
    const mediaType = {
      platforms: 'game',
      genres: 'movie',
      authors: 'book'
    }[categoryName];

    newCategoryCount += categories.length;
    if (mediaType && report.categoryCount[mediaType]) {
      report.categoryCount[mediaType].new = categories.length;
    }
  }

  // Check for data loss
  if (oldItemCount !== newItemCount) {
    report.differences.push(
      `Item count mismatch: ${oldItemCount} old vs ${newItemCount} new`
    );
    report.dataPreserved = false;
  }

  if (oldCategoryCount !== newCategoryCount) {
    report.differences.push(
      `Category count mismatch: ${oldCategoryCount} old vs ${newCategoryCount} new`
    );
    report.dataPreserved = false;
  }

  if (oldNoteCount !== newNoteCount) {
    report.differences.push(
      `Note count mismatch: ${oldNoteCount} old vs ${newNoteCount} new`
    );
    report.dataPreserved = false;
  }

  report.totals = {
    old: { items: oldItemCount, categories: oldCategoryCount, notes: oldNoteCount },
    new: { items: newItemCount, categories: newCategoryCount, notes: newNoteCount }
  };

  return report;
}

/**
 * Create a detailed transformation report
 * @param {Object} oldExport - Old format (v2.0)
 * @param {Object} newExport - New format (v3.0)
 * @returns {string} Human-readable report
 */
export function generateTransformationReport(oldExport, newExport) {
  const validation = validateTransformedData(newExport);
  const comparison = compareExports(oldExport, newExport);

  let report = '=== DATA TRANSFORMATION REPORT ===\n\n';

  report += '📊 TRANSFORMATION SUMMARY\n';
  report += `✅ Valid format: ${validation.isValid ? 'YES' : 'NO'}\n`;
  report += `✅ Data preserved: ${comparison.dataPreserved ? 'YES' : 'NO'}\n\n`;

  report += '📈 ITEM COUNTS\n';
  for (const [mediaType, counts] of Object.entries(comparison.itemCounts)) {
    report += `${mediaType.toUpperCase()}:\n`;
    report += `  Old: ${counts.old}\n`;
    report += `  New: ${counts.new}\n`;
    report += `  Match: ${counts.old === counts.new ? '✅' : '❌'}\n`;
  }

  report += '\n🏷️ CATEGORY COUNTS\n';
  for (const [mediaType, counts] of Object.entries(comparison.categoryCount)) {
    report += `${mediaType.toUpperCase()}:\n`;
    report += `  Old: ${counts.old}\n`;
    report += `  New: ${counts.new}\n`;
    report += `  Match: ${counts.old === counts.new ? '✅' : '❌'}\n`;
  }

  report += '\n📝 DETAILED BREAKDOWN\n';
  for (const [mediaType, summary] of Object.entries(validation.summary)) {
    report += `${mediaType.toUpperCase()}:\n`;
    report += `  Total Items: ${summary.items}\n`;
    report += `  By Status:\n`;
    for (const [status, count] of Object.entries(summary.byStatus)) {
      report += `    - ${status}: ${count}\n`;
    }
    report += `  Categories: ${summary.categories}\n`;
    report += `  Notes: ${summary.notes}\n`;
  }

  if (validation.errors.length > 0) {
    report += '\n❌ ERRORS\n';
    for (const error of validation.errors) {
      report += `  - ${error}\n`;
    }
  }

  if (validation.warnings.length > 0) {
    report += '\n⚠️ WARNINGS\n';
    for (const warning of validation.warnings) {
      report += `  - ${warning}\n`;
    }
  }

  return report;
}
