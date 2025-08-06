# Logger Utility

## Anvendelse

Logger-modulet (`logger.js`) giver en sikker måde at håndtere logging på, der automatisk tilpasser sig miljøet.

### Import

```javascript
import { logger, debug, info, warn, error } from './utils/logger';
```

### Metoder

- `debug()` - Vises kun i development mode
- `info()` - Vises kun i development mode  
- `warn()` - Vises altid
- `error()` - Vises altid, men saniteres i production

### Eksempel

```javascript
import { error, warn, debug } from './utils/logger';

// Development: Viser fuld fejlbesked
// Production: Viser generisk fejlbesked
error('Database connection failed:', err);

// Vises altid
warn('Deprecated function used');

// Kun development
debug('User data loaded:', userData);
```

## Sikkerhedsfordele

1. **Ingen sensitive data i production logs** - Error logs saniteres automatisk
2. **Centraliseret logging** - Let at integrere med externe tjenester
3. **Miljø-aware** - Automatisk tilpasning til development/production
4. **Fremtidssikret** - Klar til integration med Sentry, LogRocket m.fl.

## Konfiguration

Loggeren detekterer automatisk miljøet via `import.meta.env.MODE` og tilpasser adfærden:

- **Development**: Alle logs vises i consollen
- **Production**: Kun warnings og saniterede errors vises