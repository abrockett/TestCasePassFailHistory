Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [{
        xtype: 'container',
        itemId: 'mainHeader'
    }, {
        xtype: 'container',
        itemId: 'testCaseGrids'
    }],
    
    launch: function () {
        var prevDate30 = Rally.util.DateTime.add(new Date(), 'day', -30);
        var isoPrevDate30 = Rally.util.DateTime.toIsoString(prevDate30, false);

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
        return (obj.get(str) === undefined) ? '' : obj.get(str);
    },

    _testerIfKnown: function (testerObj) {
        return (typeof testerObj === 'object') ? ((testerObj.DisplayName !== undefined) ? testerObj.DisplayName : ((testerObj.UserName !== undefined) ? testerObj.UserName : '')) : '';
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
        var testCaseHolder = {};  // will be keyed by TestCase FormattedID with a value of
        // {'TestCase': tc, 'results': [tcr, tcr, tcr, tcr, ...]}
        var tcr, tc;
        for (var i = 0; i < testCaseResults.length; i++) {
            tcr = testCaseResults[i];
            tc = tcr.get('TestCase');
            if (tc !== undefined) {
                if (!testCaseHolder.hasOwnProperty(tc.FormattedID))  // no existing entry for tc.FormattedID ?
                {
                    testCaseHolder[tc.FormattedID] = {'TestCase': tc, 'results': []};
                }
                testCaseHolder[tc.FormattedID].results.push(tcr);
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
        //TO DO: update to use store and data instead of queryResults
        if (data.length < 1) {
            this.down('#testCaseGrids').add(
                Ext.create('Ext.container.Container', {
                    html: "No Test Case information found for the current workspace and project",
                    cls: 'error404'
                })
            );
    
            return;
        }
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
            tcTitle = TC_LINK.replace('_TARGET_URL_', Rally.util.Navigation.createRallyDetailUrl(testCase));
            tcTitle = tcTitle.replace('_ID_', tcFormattedID).replace('_NAME_', testCase.Name);
            if (testCase.WorkProduct !== null) {
                wpInfo = testCase.WorkProduct.FormattedID + ': ' + testCase.WorkProduct.Name;
                wpLink = WP_LINK.replace("_WP_TARGET_", Rally.util.Navigation.createRallyDetailUrl(testCase.WorkProduct));
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
                    ID: '<a href="' + Rally.util.Navigation.createRallyDetailUrl(that._conditionalGet(tcrs[j], '_ref')) + '" target="_top">' + that._conditionalGet(tcrs[j], 'ObjectID') + '</a>',
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
});