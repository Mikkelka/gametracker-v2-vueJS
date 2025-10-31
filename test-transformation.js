/**
 * Test Transformation Script
 * Run this with your exported JSON file to test the transformation
 *
 * Usage:
 * node test-transformation.js <path-to-export-file>
 *
 * Example:
 * node test-transformation.js "C:\Users\mikke\Downloads\mediatrack-backup-2025-10-31 (2).json"
 */

import fs from 'fs';
import path from 'path';

// Import transformation functions
// Note: In a real scenario, you'd use proper ES module imports
// For testing, we'll include the functions inline

/**
 * Transform old export format to new format
 */
function transformExportData(oldExport) {
  if (!oldExport || !oldExport.mediaTypes) {
    throw new Error('Invalid export data: missing mediaTypes');
  }

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

  const statusLists = {
    game: ['upcoming', 'willplay', 'playing', 'completed', 'paused', 'dropped'],
    movie: ['upcoming', 'willwatch', 'watching', 'completed', 'paused', 'dropped'],
    book: ['upcoming', 'willread', 'reading', 'completed', 'paused', 'dropped']
  };

  const categoryNames = {
    game: 'platforms',
    movie: 'genres',
    book: 'authors'
  };

  for (const [mediaType, oldData] of Object.entries(oldExport.mediaTypes)) {
    if (!oldData || !oldData.items) {
      console.warn(`⚠️  Skipping ${mediaType}: no items data`);
      continue;
    }

    const categoryName = categoryNames[mediaType];
    if (categoryName && oldData.categories && oldData.categories.length > 0) {
      newExport.data.metadata[categoryName] = oldData.categories;
    } else {
      newExport.data.metadata[categoryName] = [];
    }

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

    const statusList = statusLists[mediaType] || [];
    const mediaTypeLists = {};

    for (const status of statusList) {
      mediaTypeLists[status] = [];
    }

    for (const item of oldData.items) {
      const status = item.status;

      if (!statusList.includes(status)) {
        console.warn(`⚠️  Unknown status "${status}" for ${mediaType}. Skipping: ${item.title}`);
        continue;
      }

      const transformedItem = {
        id: item.id,
        title: item.title,
        platform: item.platform || item.genre || item.author,
        platformColor: item.platformColor || item.genreColor || item.authorColor,
        favorite: item.favorite || false,
        order: item.order !== undefined ? item.order : 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userId: item.userId,
        notes: notesMap[item.id] || []
      };

      if (item.completionDate !== undefined && item.completionDate !== null) {
        transformedItem.completionDate = item.completionDate;
      }

      mediaTypeLists[status].push(transformedItem);
    }

    newExport.data.lists[mediaType] = mediaTypeLists;
  }

  return newExport;
}

/**
 * Validate transformed data
 */
function validateTransformedData(newExport) {
  const report = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {}
  };

  if (newExport.version !== '3.0') {
    report.errors.push(`Invalid version: ${newExport.version} (expected 3.0)`);
    report.isValid = false;
  }

  if (!newExport.data || !newExport.data.metadata || !newExport.data.lists) {
    report.errors.push('Missing required structure: data.metadata or data.lists');
    report.isValid = false;
    return report;
  }

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

      for (const item of items) {
        if (!item.id || !item.title) {
          report.errors.push(`Invalid item in ${mediaType}.${status}: missing id or title`);
          report.isValid = false;
        }

        if (item.notes && Array.isArray(item.notes)) {
          report.summary[mediaType].notes += item.notes.length;
          totalNotes += item.notes.length;
        }
      }
    }

    const categoryName = {
      game: 'platforms',
      movie: 'genres',
      book: 'authors'
    }[mediaType];

    const categories = newExport.data.metadata[categoryName];
    if (categories && Array.isArray(categories)) {
      report.summary[mediaType].categories = categories.length;
      totalCategories += categories.length;

      for (const category of categories) {
        if (!category.id || !category.name) {
          report.errors.push(`Invalid category in ${categoryName}: missing id or name`);
          report.isValid = false;
        }
      }
    }
  }

  report.totals = {
    items: totalItems,
    categories: totalCategories,
    notes: totalNotes
  };

  return report;
}

/**
 * Compare old and new exports
 */
function compareExports(oldExport, newExport) {
  const report = {
    dataPreserved: true,
    differences: [],
    itemCounts: {},
    categoryCount: {}
  };

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
    newCategoryCount += categories.length;
  }

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
 * Generate transformation report
 */
function generateTransformationReport(oldExport, newExport) {
  const validation = validateTransformedData(newExport);
  const comparison = compareExports(oldExport, newExport);

  let report = '\n╔════════════════════════════════════════╗\n';
  report += '║   DATA TRANSFORMATION REPORT           ║\n';
  report += '╚════════════════════════════════════════╝\n\n';

  report += '✅ TRANSFORMATION SUMMARY\n';
  report += '─────────────────────────────────────────\n';
  report += `Valid format: ${validation.isValid ? '✅ YES' : '❌ NO'}\n`;
  report += `Data preserved: ${comparison.dataPreserved ? '✅ YES' : '❌ NO'}\n\n`;

  report += '📊 ITEM COUNTS BY MEDIA TYPE\n';
  report += '─────────────────────────────────────────\n';
  for (const [mediaType, counts] of Object.entries(comparison.itemCounts)) {
    const match = counts.old === counts.new ? '✅' : '❌';
    report += `${mediaType.toUpperCase().padEnd(10)} Old: ${String(counts.old).padStart(3)} → New: ${String(counts.new).padStart(3)} ${match}\n`;
  }

  report += '\n🏷️ CATEGORY COUNTS BY MEDIA TYPE\n';
  report += '─────────────────────────────────────────\n';
  for (const [mediaType, counts] of Object.entries(comparison.categoryCount)) {
    const match = counts.old === counts.new ? '✅' : '❌';
    report += `${mediaType.toUpperCase().padEnd(10)} Old: ${String(counts.old).padStart(2)} → New: ${String(counts.new).padStart(2)} ${match}\n`;
  }

  report += '\n📝 DETAILED BREAKDOWN BY STATUS\n';
  report += '─────────────────────────────────────────\n';
  for (const [mediaType, summary] of Object.entries(validation.summary)) {
    report += `\n${mediaType.toUpperCase()}\n`;
    report += `  Total items: ${summary.items}\n`;
    report += `  By status:\n`;
    for (const [status, count] of Object.entries(summary.byStatus)) {
      report += `    - ${status.padEnd(12)}: ${count}\n`;
    }
    report += `  Categories: ${summary.categories}\n`;
    report += `  Notes: ${summary.notes}\n`;
  }

  report += '\n📈 OVERALL TOTALS\n';
  report += '─────────────────────────────────────────\n';
  report += `Old format: ${comparison.totals.old.items} items, ${comparison.totals.old.categories} categories, ${comparison.totals.old.notes} notes\n`;
  report += `New format: ${comparison.totals.new.items} items, ${comparison.totals.new.categories} categories, ${comparison.totals.new.notes} notes\n`;

  if (validation.errors.length > 0) {
    report += '\n❌ ERRORS\n';
    report += '─────────────────────────────────────────\n';
    for (const error of validation.errors) {
      report += `  ❌ ${error}\n`;
    }
  }

  if (validation.warnings.length > 0) {
    report += '\n⚠️  WARNINGS\n';
    report += '─────────────────────────────────────────\n';
    for (const warning of validation.warnings) {
      report += `  ⚠️  ${warning}\n`;
    }
  }

  if (validation.isValid && comparison.dataPreserved) {
    report += '\n🎉 TRANSFORMATION SUCCESSFUL!\n';
    report += '═════════════════════════════════════════\n';
  } else {
    report += '\n❌ TRANSFORMATION FAILED!\n';
    report += '═════════════════════════════════════════\n';
  }

  return report;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node test-transformation.js <path-to-export-file>');
    console.log('\nExample:');
    console.log('  node test-transformation.js "C:\\Users\\mikke\\Downloads\\mediatrack-backup-2025-10-31 (2).json"');
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    console.log(`📂 Loading file: ${filePath}\n`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const oldExport = JSON.parse(fileContent);

    console.log('🔄 Transforming data...\n');
    const newExport = transformExportData(oldExport);

    console.log(generateTransformationReport(oldExport, newExport));

    // Save transformed data
    const outputPath = filePath.replace('.json', '-transformed.json');
    fs.writeFileSync(outputPath, JSON.stringify(newExport, null, 2), 'utf-8');
    console.log(`\n💾 Transformed data saved to: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Error during transformation:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
