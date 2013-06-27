Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    requires: ['HeaderRow', 'TestCaseTable'],
    componentCls: 'app',

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
        var prevDate30 = Rally.util.DateTime.add(new Date(), 'day', -180);
        var isoPrevDate30 = Rally.util.DateTime.toIsoString(prevDate30, false);

        this.down('#mainHeader').update('Test case history for last 30 days:');

        Ext.create('Rally.data.WsapiDataStore', {    
            model: 'TestCaseResult',
            autoLoad: true,
            fetch: ['ObjectID', 'Build', 'Date', 'Verdict', 'Duration', 'Tester', 'UserName', 'DisplayName', 'TestCase', 'FormattedID', 'Name', 'WorkProduct'],
            filters: [{
                property: 'Date',
                operator: '>=',
                value: isoPrevDate30
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
    
    _conditionalGet: function (obj, str) {
        if (obj.get(str) === undefined) {
            return '';
        } else {
            return obj.get(str);
        }
    },

    _testerIfKnown: function (testerObj) {
        if (typeof testerObj === 'object' && testerObj.DisplayName !== undefined) {
            return testerObj.DisplayName;
        } else if (typeof testerObj === 'object' && testerObj.UserName !== undefined) {
            return testerObj.UserName;
        } else {
            return '';
        }
    },
    
    _drawBox: function (verdict) {
        var verdictClass = 'pass-legend-other';
        if (verdict === 'Pass') {
            verdictClass = 'pass-legend';
        }
        if (verdict === 'Fail') {
            verdictClass = 'pass-legend-fail';
        }
        return '<div class="' + verdictClass + '"><div style="margin:2px;">' + verdict + '</div></div>';
    },
    
    _organizeResultsByTestCase: function (testCaseResults) {
        //debugger;
        var testCaseHolder = {};  // will be keyed by TestCase FormattedID with a value of
        // {'TestCase': tc, 'results': [tcr, tcr, tcr, tcr, ...]}
        var tcResult, testCase;
        for (var i = 0; i < testCaseResults.length; i++) {
            tcResult = testCaseResults[i];
            testCase = tcResult.get('TestCase');
            //debugger;
            if (testCase !== undefined) {
                if (!testCaseHolder.hasOwnProperty(testCase.FormattedID))  // no existing entry for tc.FormattedID ?
                {
                    testCaseHolder[testCase.FormattedID] = {'TestCase': testCase, 'results': []};
                }
                testCaseHolder[testCase.FormattedID].results.push(tcResult);
            }
            
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

    _onTestCasesDataLoaded: function (store, data) {
        //debugger;
        //TO DO: update to use store and data instead of queryResults
        if (data.length < 1) {
            this.down('#mainHeader').update('');
            this.down('#testCaseGrids').add(
                Ext.create('Ext.container.Container', {
                    html: "No Test Case information found for the current workspace, project and time scale",
                    cls: 'error404'
                })
            );
        } else {
            var testCaseHolder = this._organizeResultsByTestCase(data);
            var testCases = this._ascendingOrderedTestCases(testCaseHolder);
            
            var records, customStore;
            var tcFormattedID, testCase, tcTitle, tcrs;
            var wpInfo, wpLink;
            var TC_LINK = '<a href="_TARGET_URL_" target="_top">_ID_: _NAME_</a> _WP_LINK_';
            var WP_LINK = '(<a href="_WP_TARGET_" target="_top">_WP_TEXT_</a>)'; 
            var i, j, that = this;
            for (i = 0; i < testCases.length; i++) {
                records = [];
                tcTitle = wpLink = '';
                tcFormattedID = testCases[i];
                testCase = testCaseHolder[tcFormattedID].TestCase;
                tcTitle = TC_LINK.replace('_TARGET_URL_', Rally.nav.Manager.getDetailUrl(testCase));
                tcTitle = tcTitle.replace('_ID_', tcFormattedID).replace('_NAME_', testCase.Name);
                if (testCase.WorkProduct !== null) {
                    wpInfo = testCase.WorkProduct.FormattedID + ': ' + testCase.WorkProduct.Name;
                    wpLink = WP_LINK.replace("_WP_TARGET_", Rally.nav.Manager.getDetailUrl(testCase.WorkProduct));
                    wpLink = wpLink.replace("_WP_TEXT_", wpInfo);
                }
                tcTitle = tcTitle.replace('_WP_LINK_', wpLink);
                this.down('#testCaseGrids').add(
                    Ext.create('Ext.container.Container', {
                        html: tcTitle,
                        cls: 'gridTitle'
                    })
                );
                
                tcrs = testCaseHolder[tcFormattedID].results;
                for (j = 0; j < tcrs.length; j++) {
                    records.push({
                        ID: '<a href="' + Rally.nav.Manager.getDetailUrl(that._conditionalGet(tcrs[j], '_ref')) + '" target="_top">' + that._conditionalGet(tcrs[j], 'ObjectID') + '</a>',
                        Build: tcrs[j].get('Build'),
                        DateandTime: tcrs[j].get('Date'),
                        Verdict: that._drawBox(tcrs[j].get('Verdict')),
                        Tester: that._testerIfKnown(tcrs[j].get('Tester'))
                    });
                }

                customStore = Ext.create('Rally.data.custom.Store', {
                    data: records,
                    pageSize: records.length
                });

                this.down('#testCaseGrids').add(
                    Ext.create('Ext.container.Container', {
                        layout: 'fit',
                        cls: 'gridContainer',
                        items: {
                            xtype: 'rallygrid',
                            store: customStore,
                            cls: 'testCaseGrid',
                            showPagingToolbar: false,
                            columnCfgs: [{
                                text: 'ID',
                                dataIndex: 'ID',
                                cls: 'columnHeader',
                                flex: 2
                            }, {
                                text: 'Verdict',
                                dataIndex: 'Verdict',
                                cls: 'columnHeader',
                                width: 100
                            }, {
                                text: 'Build',
                                dataIndex: 'Build',
                                cls: 'columnHeader',
                                flex: 2
                            }, {
                                text: 'Date and Time',
                                dataIndex: 'DateandTime',
                                cls: 'columnHeader',
                                flex: 3
                            }, {
                                text: 'Tester',
                                dataIndex: 'Tester',
                                cls: 'columnHeader',
                                flex: 2
                            }]
                        }
                    })
                );
            }
        }
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

    _onButtonPressed: function() {
        var title = 'Test Case Pass-Fail History', options;

        // code to get the style that we added in the app.css file
        var css = document.getElementsByTagName('style')[0].innerHTML;


        
        options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";
        var printWindow = window.open('', '', options);

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

        printWindow.print();

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
        //find all the stylesheets on the current page and inject them into the new page
        Ext.each(Ext.query('link'), function(stylesheet){
                this._injectContent('', 'link', {
                rel: 'stylesheet',
                href: stylesheet.href,
                type: 'text/css'
            }, printWindow.document.getElementsByTagName('head')[0], printWindow);
        }, this);

    }
});