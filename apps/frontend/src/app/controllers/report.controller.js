(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('ReportController', ReportController);

    ReportController.$inject = ['$scope', 'ReportService', 'TermService', 'DepartmentService', 'CourseService'];

    function ReportController($scope, ReportService, TermService, DepartmentService, CourseService) {
        var vm = this;

        vm.isLoading = false;
        vm.error = null;
        
        // Report Types
        vm.reportTypes = [
            { id: 'course-enrollment', name: 'Course Enrollment Report' },
            { id: 'student-attendance', name: 'Student Attendance Report' },
            { id: 'faculty-workload', name: 'Faculty Workload Report' },
            { id: 'enrollment-status', name: 'Enrollment Status Report' },
            { id: 'department-summary', name: 'Department Summary Report' },
            { id: 'low-attendance', name: 'Low Attendance Report' }
        ];

        vm.filters = {
            reportType: 'course-enrollment',
            termId: '',
            departmentId: '',
            courseId: '',
            threshold: 75 // For low attendance
        };

        // Lookup data
        vm.terms = [];
        vm.departments = [];
        vm.courses = [];

        // Report Result Data
        vm.reportData = null;
        vm.reportSummary = null;
        vm.isReportGenerated = false;

        // Methods
        vm.generateReport = generateReport;
        vm.exportCsv = exportCsv;
        vm.printReport = printReport;

        init();

        function init() {
            loadDependencies();
        }

        function loadDependencies() {
            TermService.list({ limit: 100 }).then(function(res) {
                vm.terms = res.data || [];
            });
            DepartmentService.list({ limit: 100 }).then(function(res) {
                vm.departments = res.data || [];
            });
            CourseService.list({ limit: 500 }).then(function(res) {
                vm.courses = res.data || [];
            });
        }

        function generateReport() {
            vm.isLoading = true;
            vm.error = null;
            vm.isReportGenerated = false;
            vm.reportData = null;

            var params = {};
            if (vm.filters.termId) params.termId = vm.filters.termId;
            if (vm.filters.departmentId) params.departmentId = vm.filters.departmentId;
            if (vm.filters.courseId) params.courseId = vm.filters.courseId;

            var request;
            switch(vm.filters.reportType) {
                case 'course-enrollment':
                    request = ReportService.getCourseEnrollment(params);
                    break;
                case 'student-attendance':
                    request = ReportService.getStudentAttendance(params);
                    break;
                case 'faculty-workload':
                    request = ReportService.getFacultyWorkload(params);
                    break;
                case 'enrollment-status':
                    request = ReportService.getEnrollmentStatus(params);
                    break;
                case 'department-summary':
                    request = ReportService.getDepartmentSummary(params);
                    break;
                case 'low-attendance':
                    if (vm.filters.threshold) params.threshold = vm.filters.threshold;
                    request = ReportService.getLowAttendance(params);
                    break;
                default:
                    vm.isLoading = false;
                    vm.error = "Invalid report type selected.";
                    return;
            }

            request.then(function(response) {
                // Determine structure based on API return type
                // Backend standard: { success: true, data: [...] }
                var data = response.data || {};
                
                if (data.summary) {
                    vm.reportSummary = {};
                    Object.keys(data.summary).forEach(function(key) {
                        var val = data.summary[key];
                        // Only include primitives in the summary cards
                        if (val !== null && typeof val !== 'object') {
                            vm.reportSummary[key] = val;
                        }
                    });
                } else {
                    vm.reportSummary = null;
                }

                if (Array.isArray(data)) {
                    vm.reportData = data;
                } else if (data.records) {
                    vm.reportData = data.records;
                } else if (data.courses && Array.isArray(data.courses)) {
                    vm.reportData = data.courses;
                } else if (data.byStudent && Array.isArray(data.byStudent)) {
                    vm.reportData = data.byStudent;
                } else if (data.enrollments && Array.isArray(data.enrollments)) {
                    vm.reportData = data.enrollments;
                } else if (data.byCourse && Array.isArray(data.byCourse)) {
                    vm.reportData = data.byCourse;
                } else if (data.byDepartment && Array.isArray(data.byDepartment)) {
                    vm.reportData = data.byDepartment;
                } else {
                    // Fallback to first array found
                    var keys = Object.keys(data);
                    var foundArray = false;
                    for (var i = 0; i < keys.length; i++) {
                        if (Array.isArray(data[keys[i]])) {
                            vm.reportData = data[keys[i]];
                            foundArray = true;
                            break;
                        }
                    }
                    if (!foundArray) vm.reportData = [];
                }
                
                vm.isReportGenerated = true;
                vm.isLoading = false;
            }).catch(function(err) {
                vm.isLoading = false;
                vm.error = err.data && err.data.message ? err.data.message : 'Failed to generate report.';
            });
        }

        function exportCsv() {
            if (!vm.reportData || !vm.reportData.length) return;
            
            var csvContent = "data:text/csv;charset=utf-8,";
            
            // Get Headers
            var firstItem = vm.reportData[0];
            var keys = Object.keys(firstItem).filter(function(k) { return typeof firstItem[k] !== 'object'; });
            csvContent += keys.join(",") + "\r\n";
            
            // Get Rows
            vm.reportData.forEach(function(row) {
                var rowArray = keys.map(function(k) { 
                    var val = row[k] === null || row[k] === undefined ? '' : row[k];
                    return '"' + String(val).replace(/"/g, '""') + '"'; 
                });
                csvContent += rowArray.join(",") + "\r\n";
            });
            
            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", vm.filters.reportType + "-" + new Date().toISOString().slice(0,10) + ".csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function printReport() {
            window.print();
        }
    }
})();
