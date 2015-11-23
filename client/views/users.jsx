var _ = require('lodash');
var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var TitleMixin = require('./titleMixin');

var Users = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('users'), TitleMixin('user search')
  ],
  getStateFromFlux: function() {
    var store = this.getFlux().store('users');
    return {
      loading: store.isLoading(),
      saving: store.isSaving(),
      error: store.getError(),
      results: store.getResults()
    };
  },
  // Redirect to a valid URL query from the potentially invalid user-supplied query.
  _forceValidQuery: function() {
    var oldQuery = this.props.location.query;
    var newQuery = {};
    // Only these parameters can be filtered on.
    var validFilter = ['emailAddress', 'givenName', 'familyName'];
    for (var i in validFilter) {
      var parameter = validFilter[i];
      newQuery[parameter] = oldQuery[parameter];
    }
    // sortBy has valid values and a default.
    var validSortBy = ['emailAddress', 'givenName', 'familyName'];
    if (!oldQuery.sortOrder || (validSortBy.indexOf(oldQuery.sortOrder) == -1)) {
      newQuery.sortBy = validSortBy[0];
    } else {
      newQuery.sortBy = oldQuery.sortBy;
    }
    // sortOrder has valid values and a default.
    var validSortOrder = ['ascending', 'descending'];
    if (!oldQuery.sortOrder || (validSortOrder.indexOf(oldQuery.sortOrder) == -1)) {
      newQuery.sortOrder = validSortOrder[0];
    } else {
      newQuery.sortOrder = oldQuery.sortOrder;
    }
    // If the valid query differs from the supplied query, redirect to it.
    var pathname = this.props.location.pathname;
    if (!_.isEqual(newQuery, oldQuery)) {
      this.props.history.replaceState(null, pathname, newQuery);
    }
  },
  // Read the search parameters from the controls and use them to construct a URL query.
  _updateSearchParameters: function () {
    // TODO Collect the search parameters from the controls.
    var parameters = {
      givenName: null,
      familyName: null,
      emailAddress: null,
      sortBy: null,
      sortOrder: null
    };
    // Navigate to this page, but with the new parameters as the query.
    this.props.history.pushState(null, this.props.location.pathname, parameters);
  },
  // Initiate a search from the URL query.
  _doSearch: function() {
    this.getFlux().actions.users.doSearch(this.props.location.query);
  },
  _loadMoreResults: function() {
    this.getFlux().actions.users.loadMoreResults();
  },
  componentWillMount: function(nextProps) {
    this._forceValidQuery();
    // TODO determine if the redirect in forceValidQuery fires a componentWillUpdate. If so, then we don't need to do any more here.
  },
  componentWillUpdate: function(nextProps, nextState) {
    console.log(nextProps.location.query);
  },
  render: function() {
    // TODO Set the values on the controls from the query.
    // TODO Bind onChange for every control to this._updateSearchParameters.
    return (
      <div id='userSearch'>
        <form id='filter'>
          <label>
            email address
            <input type='email' ref='emailAddress'/>
          </label>
        </form>
      </div>
    );
  }
});

module.exports = Users;
