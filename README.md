# Creazione directory principali
mkdir -p css js/lib js/services js/components js/utils
mkdir -p data backups docs assets/icons

# Creazione file principali
touch index.html
touch css/style.css css/components.css css/responsive.css
touch js/app.js js/config.js
touch js/services/database.js js/services/yahoo-finance.js
touch js/services/backup-manager.js js/services/supabase-client.js
touch js/components/dashboard.js js/components/charts.js
touch js/utils/helpers.js js/utils/cache.js
touch .env.example README.md

# File di configurazione
touch .github/workflows/deploy.yml .github/workflows/backup.yml
