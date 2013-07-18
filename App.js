Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    config: {
        defaultSettings: {
            dateSetting: 30
        }
    },

    items: [{
        xtype: 'container',
        itemId: 'mainHeader',
        componentCls: 'header'
    }, 
    {
        xtype: 'container',
        itemId: 'testCaseGrids'
    }],
    
    launch: function () {
        console.log(this.getSettings().dateSetting);
        this.daysToRecord = this.getSettings().dateSetting;
        this.down('#mainHeader').update('Test case history for last ' + this.daysToRecord + ' days:');

        Ext.create('Rally.data.WsapiDataStore', {    
            model: 'TestCaseResult',
            autoLoad: true,
            fetch: ['ObjectID', 'Build', 'Date', 'Verdict', 'Duration', 'TestCase', 'FormattedID', 
                'Name', 'WorkProduct', 'Tester', 'UserName', 'DisplayName'],
            filters: [{
                property: 'Date',
                operator: '>=',
                value: Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(), 'day', -this.daysToRecord), false)
            }],
            sorters: [{
                property: 'Date',
                direction: 'DESC'
            }],
            listeners: {
                load: this._onTestCasesDataLoaded,
                scope: this
            }
        });
    },

    _onTestCasesDataLoaded: function (store, data) {
        debugger;
        if (data.length < 1) {
            this._displayEmptyDataText();
        } else {
            var testCaseHolder = this._organizeResultsByTestCase(data);
            var testCases = this._ascendingOrderedTestCases(testCaseHolder);

            this._formatAndDisplayData(testCases, testCaseHolder);
        }
    },

    _formatAndDisplayData: function(testCases, testCaseHolder) {
        Ext.Array.each(testCases, function(testCaseFormattedID) {
            var testCase = testCaseHolder[testCaseFormattedID].TestCase;
            var testCaseResults = testCaseHolder[testCaseFormattedID].results;
            var records = this._makeRecords(testCaseResults);
            
            /*
             *Creates titles to each test case result.
             */
            this._buildTestCaseResultTitle(testCaseFormattedID, testCase);

            /*
             *Creates grids of test cases under each result title
             */
            this._buildGrid(records);
        }, this);
    },

    _buildTestCaseResultTitle: function(FormattedID, testCase){
        var tcLinkTemplate = new Ext.Template('<a href="{targeturl}" target="_top">{id}: {name}</a> {wplink}');
        var wpLinkTemplate = new Ext.Template(' (<a href="{wptarget}" target="_top">{wpid}: {wpname}</a>)');
        var wpLink = '';

        if (testCase.WorkProduct && testCase.WorkProduct !== null) {
            wpLink = wpLinkTemplate.apply({wptarget: Rally.nav.Manager.getDetailUrl(testCase.WorkProduct), 
                wpid: testCase.WorkProduct.FormattedID, wpname: testCase.WorkProduct.Name});
        }

        var testCaseTitle = tcLinkTemplate.apply({targeturl: Rally.nav.Manager.getDetailUrl(testCase), 
            id: FormattedID, name: testCase.Name, wplink: wpLink});

        this.down('#testCaseGrids').add(
            Ext.create('Ext.container.Container', {
                html: testCaseTitle,
                componentCls: 'gridTitle'
            })
        );
    },

    _makeRecords: function(testCaseResults) {
        var records = Ext.Array.map(testCaseResults, function(testCaseResult) {
            return {
                ID: '<a href="' + Rally.nav.Manager.getDetailUrl(this._conditionalGet(testCaseResult, '_ref')) +
                    '" target="_top">' + this._conditionalGet(testCaseResult, 'ObjectID') + '</a>',
                Build: testCaseResult.get('Build'),
                DateandTime: testCaseResult.get('Date'),
                Verdict: this._drawBox(testCaseResult.get('Verdict')),
                Tester: this._testerIfKnown(testCaseResult.get('Tester'))
            };
        }, this);

        return records;
    },
    
    _organizeResultsByTestCase: function (testCaseResults) {
        debugger;
        var testCaseHolder = {};
        var testCaseResult, testCase;
        for (var i = 0; i < testCaseResults.length; i++) {
            testCaseResult = testCaseResults[i];
            testCase = testCaseResult.get('TestCase');

            //there should always be a test case, but we have this if-statement in case
            var id = 'No Test Case';
            if (testCase) {
                id = testCase.FormattedID;
            }

            if (!testCaseHolder.hasOwnProperty(id)) {
                testCaseHolder[id] = {'TestCase': testCase, 'results': []};
            }

            testCaseHolder[id].results.push(testCaseResult);
        }
        return testCaseHolder;
    },
    
    _ascendingOrderedTestCases: function (testCaseHolder) {
        var testCases = [], formattedID;
        for (formattedID in testCaseHolder) {
            if (testCaseHolder.hasOwnProperty(formattedID)) {
                testCases.push(formattedID);
            }
        }
        
        testCases.sort();
        return testCases;
    },
    
    _conditionalGet: function (object, string) {
        if (!object.get(string)) {
            return '';
        } else {
            return object.get(string);
        }
    },

    _testerIfKnown: function (tester) {
        if (typeof tester === 'object' && tester.DisplayName) {
            return tester.DisplayName;
        } else if (typeof tester === 'object' && tester.UserName) {
            return tester.UserName;
        } else {
            return '';
        }
    },
    
    _drawBox: function (verdict) {
        var boxTemplate = new Ext.Template('<div class="{verdictClass}"><div style="margin:2px;">{verdict}</div></div>');

        var verdictClass = 'pass-legend-other';
        if (verdict === 'Pass') {
            verdictClass = 'pass-legend';
        } else if (verdict === 'Fail') {
            verdictClass = 'pass-legend-fail';
        }
        return boxTemplate.apply({verdictClass: verdictClass, verdict: verdict});
    },

    _buildGrid: function(records) {
        var customStore = Ext.create('Rally.data.custom.Store', {
            data: records,
            pageSize: records.length
        });

        this.down('#testCaseGrids').add(
            Ext.create('Ext.container.Container', {
                layout: 'fit',
                componentCls: 'gridContainer',
                items: {
                    xtype: 'rallygrid',
                    store: customStore,
                    componentCls: 'testCaseGrid',
                    showPagingToolbar: false,
                    columnCfgs: [
                        {text: 'ID', dataIndex: 'ID', componentCls: 'columnHeader', flex: 2},
                        {text: 'Verdict', dataIndex: 'Verdict', componentCls: 'columnHeader', width: 100},
                        {text: 'Build', dataIndex: 'Build', componentCls: 'columnHeader', flex: 2},
                        {text: 'Date and Time', dataIndex: 'DateandTime', componentCls: 'columnHeader', flex: 3},
                        {text: 'Tester', dataIndex: 'Tester', componentCls: 'columnHeader', flex: 2}
                    ]
                }
            })
        );
    },

    _displayEmptyDataText: function() {
        this.down('#mainHeader').update('');
        this.down('#testCaseGrids').add(
            Ext.create('Ext.container.Container', {
                html: "No Test Case information found for the current workspace, project and time scale of last " + 
                    this.daysToRecord + " days",
                componentCls: 'error404'
            })
        );
    },

    getOptions: function() {
        return [
            {
                text: 'Print',
                handler: this._onButtonPressed,
                scope: this
            }
        ];
    },

    getSettingsFields: function() {
        return [
            {
                name: 'dateSetting',
                xtype: 'rallynumberfield',
                fieldLabel: '# Days of past Test Case results: ',
                minValue: 1,
                maxValue: 365,
                width: 260,
                labelWidth: 180,
                componentCls: 'number-field'
            }
        ];
    },

    _onButtonPressed: function() {
        var title = 'Test Case Pass-Fail History', options;

        // code to get the style that we added in the app.css file
        var css = document.getElementsByTagName('style')[0].innerHTML;

        options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";

        var printWindow;
        if (Ext.isIE) {
            printWindow = window.open();
        } else {
            printWindow = window.open('', '', options);
        }

        var doc = printWindow.document;


        var grids = this.down('#testCaseGrids');
        var header = this.down('#mainHeader');

        doc.write('<html><head>' + '<style>' + css + '</style><title>' + title + '</title>');


        doc.write('</head><body class="landscape">');
        doc.write(header.getEl().dom.innerHTML);
        doc.write(grids.getEl().dom.innerHTML);
        doc.write('</body></html>');
        doc.close();

        this._injectCSS(printWindow);

        if (Ext.isSafari) {
            var timeout = setTimeout(function() {
                printWindow.print();
            }, 500);
        } else {
            printWindow.print();
        }

    },

    _injectContent: function(html, elementType, attributes, container, printWindow){
        elementType = elementType || 'div';
        container = container || printWindow.document.getElementsByTagName('body')[0];

        var element = printWindow.document.createElement(elementType);

        Ext.Object.each(attributes, function(key, value){
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if(html){
            element.innerHTML = html;
        }

        return container.appendChild(element);
    },

    _injectCSS: function(printWindow){
        Ext.each(Ext.query('link'), function(stylesheet){
                this._injectContent('', 'link', {
                rel: 'stylesheet',
                href: stylesheet.href,
                type: 'text/css'
            }, printWindow.document.getElementsByTagName('head')[0], printWindow);
        }, this);

    }
});