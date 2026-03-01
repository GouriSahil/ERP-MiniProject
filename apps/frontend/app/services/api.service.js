(function() {
  'use strict';

  angular.module('erpApp.services', [])
    .factory('ApiService', ApiService);

  ApiService.$inject = ['$http', 'API_CONFIG'];

  function ApiService($http, API_CONFIG) {
    var service = {
      get: get,
      post: post,
      put: put,
      delete: deleteResource
    };

    return service;

    function get(endpoint, params) {
      return $http.get(API_CONFIG.baseUrl + endpoint, {
        params: params,
        timeout: API_CONFIG.timeout
      }).then(handleSuccess, handleError);
    }

    function post(endpoint, data) {
      return $http.post(API_CONFIG.baseUrl + endpoint, data, {
        timeout: API_CONFIG.timeout
      }).then(handleSuccess, handleError);
    }

    function put(endpoint, data) {
      return $http.put(API_CONFIG.baseUrl + endpoint, data, {
        timeout: API_CONFIG.timeout
      }).then(handleSuccess, handleError);
    }

    function deleteResource(endpoint) {
      return $http.delete(API_CONFIG.baseUrl + endpoint, {
        timeout: API_CONFIG.timeout
      }).then(handleSuccess, handleError);
    }

    function handleSuccess(response) {
      return response.data;
    }

    function handleError(response) {
      return {
        success: false,
        message: response.data && response.data.message || 'An error occurred',
        status: response.status
      };
    }
  }

})();
