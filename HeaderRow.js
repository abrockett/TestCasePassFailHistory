Ext.define('HeaderRow', {
	extend: 'Ext.Component',
	alias: 'widget.headerrow',
	cls: 'header-row',
	tpl: Ext.create('Ext.XTemplate', 
		'<tr>' +
		'<th>ID</th>' + 
		'<th>&nbsp;</th>' + 
		'<th>Build</th>' +
		'<th>&nbsp;</th>' +
		'<th>Date and Time</th>' +
		'<th>&nbsp;</th>' +
		'<th>Tester</th>' + '</tr>'
	)
});