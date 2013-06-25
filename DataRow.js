Ext.define('DataRow', {
	extend: 'Ext.Component',
	alias: 'widget.datarow',
	cls: 'data-row',
	tpl: Ext.create('Ext.XTemplate', 
		'<tr>' +
		'<td valign="middle"><a href=\"{[getTcrLink(values)]}\" target=\"_top\">' +
			'{[getTcrIdentification(values)]}}</a></td>' +
		'<td><&nbsp;</td>' +
        '<td valign="middle" align="center">{[getBuild(values)]}}</td>' +
        '<td><&nbsp;</td>' +
        '<td valign="middle" align="center">{[getDate(values)]}</td>' +
        '<td><&nbsp;</td>' +
        '<td valign="middle" align="center">{[getVertictBox(values)]}</td>' +
        '<td><&nbsp;</td>' +
        '<td valign="middle" align="center">{[getTester(values)]}</td>' +
		'</tr>', {
			getTcrLink: function(values) {
				return '_TCR_LINK_';
			},
			getTcrIdentification: function(values) {
				return '_TCR_IDENT_';
			},
			getBuild: function(values) {
				return '_BUILD_';
			},
			getDate: function(values) {
				return '_DATE_';
			},
			getVertictBox: function(values) {
				return '_VERDICT_BOX_';
			},
			getTester: function(values) {
				return '_TESTER_';
			}
		}
	)
});