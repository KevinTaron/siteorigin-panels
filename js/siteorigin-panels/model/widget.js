/**
 * Model for an instance of a widget
 */
module.exports = Backbone.Model.extend( {

    cell: null,

    defaults : {
        // The PHP Class of the widget
        class : null,

        // Is this class missing? Missing widgets are a special case.
        missing : false,

        // The values of the widget
        values: {},

        // Have the current values been passed through the widgets update function
        raw: false,

        // Visual style fields
        styles: {}
    },

    initialize: function(){
        var widgetClass = this.get('class');
        if( typeof panelsOptions.widgets[widgetClass] === 'undefined' || !panelsOptions.widgets[widgetClass].installed ) {
            this.set('missing', true);
        }
    },

    /**
     * @param field
     * @returns {*}
     */
    getWidgetField: function(field) {
        if(typeof panelsOptions.widgets[ this.get('class') ] === 'undefined') {
            if(field === 'title' || field === 'description') {
                return panelsOptions.loc.missing_widget[field];
            }
            else {
                return '';
            }
        }
        else {
            return panelsOptions.widgets[this.get('class')][field];
        }
    },

    /**
     * Move this widget model to a new cell. Called by the views.
     *
     * @param panels.model.cell newCell
     *
     * @return bool Indicating if the widget was moved into a different cell
     */
    moveToCell: function(newCell, options){
        options = _.extend( {
            silent: true
        }, options );

        if( this.cell.cid === newCell.cid ) {
            return false;
        }

        this.cell = newCell;
        this.collection.remove(this, options );
        newCell.widgets.add(this, options );

        return true;
    },

    /**
     * Trigger an event on the model that indicates a user wants to edit it
     */
    triggerEdit: function(){
        this.trigger('user_edit', this);
    },

    /**
     * Trigger an event on the widget that indicates a user wants to duplicate it
     */
    triggerDuplicate: function(){
        this.trigger('user_duplicate', this);
    },

    /**
     * This is basically a wrapper for set that checks if we need to trigger a change
     */
    setValues: function(values){
        var hasChanged = false;
        if( JSON.stringify( values ) !== JSON.stringify( this.get('values') ) ) {
            hasChanged = true;
        }

        this.set( 'values', values, {silent: true} );

        if( hasChanged ) {
            // We'll trigger our own change events
            this.trigger('change');
            this.trigger('change:values');
        }
    },

    /**
     * Create a clone of this widget attached to the given cell.
     *
     * @param {panels.model.cell} cell The cell model we're attaching this widget clone to.
     * @returns {panels.model.widget}
     */
    clone: function( cell, options ){
        if( typeof cell === 'undefined' ) { cell = this.cell; }

        var clone = new this.constructor( this.attributes );

        // Create a deep clone of the original values
        var cloneValues = JSON.parse( JSON.stringify( this.get('values') ) );

        // We want to exclude any fields that start with _ from the clone. Assuming these are internal.
        var cleanClone = function(vals){
            _.each( vals, function(el, i){
                if( typeof i === 'string' && i[0] === '_' ) {
                    delete vals[i];
                }
                else if ( _.isObject( vals[i] ) ) {
                    cleanClone( vals[i] );
                }
            } );

            return vals;
        };
        cloneValues = cleanClone(cloneValues);

        if( this.get('class') === "SiteOrigin_Panels_Widgets_Layout" ) {
            // Special case of this being a layout widget, it needs a new ID
            cloneValues.builder_id = Math.random().toString(36).substr(2);
        }

        clone.set( 'values', cloneValues, { silent: true } );
        clone.set( 'collection', cell.widgets, { silent: true } );
        clone.cell = cell;

        // This is used to force a form reload later on
        clone.isDuplicate = true;

        return clone;
    },

    /**
     * Gets the value that makes most sense as the title.
     */
    getTitle: function(){
        var widgetData = panelsOptions.widgets[this.get('class')];

        if( typeof widgetData === 'undefined' ) {
            return this.get('class').replace(/_/g, ' ');
        }
        else if( typeof widgetData.panels_title !== 'undefined' ) {
            // This means that the widget has told us which field it wants us to use as a title
            if( widgetData.panels_title === false ) {
                return panelsOptions.widgets[this.get('class')].description;
            }
        }

        var values = this.get('values');

        // Create a list of fields to check for a title
        var titleFields = ['title', 'text'];

        for (var k in values){
            if( values.hasOwnProperty(k) ) {
                titleFields.push( k );
            }
        }

        titleFields = _.uniq(titleFields);

        for( var i in titleFields ) {
            if(
                typeof values[titleFields[i]] !== 'undefined' &&
                typeof values[titleFields[i]] === 'string' &&
                values[titleFields[i]] !== '' &&
                values[titleFields[i]] !== 'on' &&
                titleFields[i][0] !== '_' &&
                !jQuery.isNumeric( values[titleFields[i]] )
            ) {
                var title = values[ titleFields[i] ];
                title = title.replace(/<\/?[^>]+(>|$)/g, "");
                var parts = title.split(" ");
                parts = parts.slice(0, 20);
                return parts.join(' ');
            }
        }

        // If we still have nothing, then just return the widget description
        return this.getWidgetField('description');
    }

} );