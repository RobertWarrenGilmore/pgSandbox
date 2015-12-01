var _ = require('lodash');
var React = require('react');
var TitleMixin = require('./titleMixin');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');

var Users = React.createClass({
  mixins: [TitleMixin('user search')],
  getInitialState: function() {
    return {
      busy: false,
      error: null,
      queryUpdateTimeout: null,
      workingQuery: this.props.location.query,
      results: [],
      endReached: false
    };
  },
  // Are we redirecting after input or waiting until the user manually clicks "apply"?
  _useManualApply: function() {
    // Borrowed from rackt/history/modules/DOMUtils.supportsHistory
    var ua = navigator.userAgent;
    if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) {
      return true;
    }
    if (ua.indexOf('CriOS') !== -1) {
      return true;
    }
    return !window.history || !window.history.pushState;

  },
  // Read the search parameters from the controls and use them to construct the working query.
  _updateWorkingQuery: function() {
    // Collect the search parameters from the controls.
    var parameters = {
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value,
      emailAddress: this.refs.emailAddress.value,
      sortBy: null, // TODO
      sortOrder: null // TODO
    };
    this.setState({workingQuery: parameters});
  },
  // Redirect the URL to the provided query.
  _setUrlQuery: function(query, options) {
    var delayed = options && !!options.delayed;
    var replace = options && !!options.replace;
    var validQuery = {};
    // Only these parameters can be filtered on.
    var validFilter = ['emailAddress', 'givenName', 'familyName'];
    for (var i in validFilter) {
      var parameter = validFilter[i];
      if (query[parameter]) {
        validQuery[parameter] = query[parameter];
      }
    }
    // sortBy has valid values and a default.
    var validSortBy = ['emailAddress', 'givenName', 'familyName'];
    if (!query.sortOrder || (validSortBy.indexOf(query.sortOrder) == -1)) {
      validQuery.sortBy = validSortBy[0];
    } else {
      validQuery.sortBy = query.sortBy;
    }
    // sortOrder has valid values and a default.
    var validSortOrder = ['ascending', 'descending'];
    if (!query.sortOrder || (validSortOrder.indexOf(query.sortOrder) == -1)) {
      validQuery.sortOrder = validSortOrder[0];
    } else {
      validQuery.sortOrder = query.sortOrder;
    }
    var navigate = this.props.history[replace
        ? 'replaceState'
        : 'pushState'];
    var self = this;
    var doRedirect = function() {
      if (!_.isEqual(query, validQuery)) {
        navigate(null, self.props.location.pathname, validQuery);
      }
      self._doSearch();
      if (self.state.queryUpdateTimeout) {
        self.setState({queryUpdateTimeout: null});
      }
    };
    if (this.state.queryUpdateTimeout) {
      clearTimeout(this.state.queryUpdateTimeout);
    }
    // If the valid query differs from the supplied query, redirect to it.
    if (delayed) {
      // Delay the query update to one second after the most recent edit.
      var queryUpdateTimeout = setTimeout(doRedirect, 500);
      this.setState({queryUpdateTimeout: queryUpdateTimeout});
    } else {
      doRedirect();
    }
  },
  // Initiate a search from the URL query.
  _doSearch: function() {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
    var authCredentials = auth.getCredentials();
    // TODO Add limit and offset.
    var r = ajax({
      method: 'GET',
      uri: '/api/users',
      auth: {
        user: authCredentials.emailAddress,
        pass: authCredentials.password
      },
      json: true,
      qs: this.props.location.query
    });
    this.setState({
      runningRequest: r,
      busy: true,
      error: null
    });
    var self = this;
    r.then(function(response) {
      if (response.statusCode === 200) {
        self.setState({
          busy: false,
          error: null,
          results: response.body,
          runningRequest: null
        });
      } else {
        self.setState({busy: false, error: response.body, runningRequest: null});
      }
    }).catch(function(error) {
      self.setState({busy: false, error: error.message, runningRequest: null});
    });
  },
  _loadMoreResults: function() {},
  componentWillMount: function() {
    // Correct the URL query if it's invalid.
    this._setUrlQuery(this.props.location.query, {
      replace: true,
      delayed: false
    });
  },
  componentWillReceiveProps: function(nextProps) {
    this.setState({workingQuery: nextProps.location.query});
  },
  componentWillUpdate: function(nextProps, nextState) {
    if (!this._useManualApply()) {
      var workingQueryChanged = !_.isEqual(nextState.workingQuery, this.state.workingQuery);
      var urlQueryIsBehindWorkingQuery = !_.isEqual(nextState.workingQuery, nextProps.location.query);
      if (workingQueryChanged && urlQueryIsBehindWorkingQuery) {
        this._setUrlQuery(nextState.workingQuery, {
          replace: false,
          delayed: true
        });
      }
    }
  },
  _onApply: function(event) {
    event.preventDefault();
    this._setUrlQuery(this.state.workingQuery, {
      replace: false,
      delayed: false
    });
  },
  _onRevert: function(event) {
    event.preventDefault();
    this.setState({workingQuery: this.props.location.query});
  },
  render: function() {
    return (
      <div id='userSearch'>
        <form id='filter' onChange={this._updateWorkingQuery}>
          <label>
            email address
            <input type='text' ref='emailAddress' value={this.state.workingQuery.emailAddress}/>
          </label>
          <label>
            first name
            <input type='text' ref='givenName' value={this.state.workingQuery.givenName}/>
          </label>
          <label>
            last name
            <input type='text' ref='familyName' value={this.state.workingQuery.familyName}/>
          </label>
          {this._useManualApply()
            ? (
              <div>
                <button onClick={this._onApply} disabled={this.state.busy} className='highlighted'>
                  apply
                </button>
                <button onClick={this._onRevert} disabled={this.state.busy}>
                  revert
                </button>
              </div>
            )
            : (null)}
        </form>
        <ol>
          {_.map(this.state.results, function(user) {
            return <li>{user.id} - {user.emailAddress}</li>;
          })}
          {this.state.endReached
            ? <li>no more</li>
            : <li>loading more</li>}
        </ol>
      </div>
    );
  }
});

module.exports = Users;
