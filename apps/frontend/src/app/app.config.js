(function() {
    'use strict';

    angular
        .module('erpApp')
        .constant('APP_CONFIG', {
            API_BASE_URL: 'http://localhost:3000/api',
            TOKEN_KEY: 'erp_token',
            USER_KEY: 'erp_user',
            REFRESH_TOKEN_KEY: 'erp_refresh_token',
            // Token refresh threshold (5 minutes before expiry)
            TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000
        });
})();
