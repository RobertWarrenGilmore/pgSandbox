var _ = require('lodash');
var React = require('react');
var BusyIndicator = require('./busyIndicator.jsx');
var TitleMixin = require('./titleMixin');
var appScroll = require('../utilities/appScroll');
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
      sortBy: this.refs.sortBy.value,
      sortOrder: this.refs.sortOrderDescending.checked ? 'descending' : 'ascending'
    };
    this.setState({workingQuery: parameters});
  },
  // Correct any errors in the provided query.
  _correctUrlQuery: function(query, options) {
    var delayed = options && !!options.delayed;
    var replace = options && !!options.replace;
    var validQuery = {};
    // Only these parameters can be filtered on.
    var validFilter = ['familyName', 'givenName', 'emailAddress'];
    for (var i in validFilter) {
      var parameter = validFilter[i];
      if (query[parameter]) {
        validQuery[parameter] = query[parameter];
      }
    }
    // sortBy has valid values and a default.
    var validSortBy = ['familyName', 'givenName', 'emailAddress'];
    if (!query.sortBy || (validSortBy.indexOf(query.sortBy) == -1)) {
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
  _doSearch: function(offset) {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
    var authCredentials = auth.getCredentials();
    // TODO Add limit and offset.
    var query = _.cloneDeep(this.props.location.query);
    if (offset) {
      query.offset = offset;
    }
    var r = ajax({
      method: 'GET',
      uri: '/api/users',
      auth: authCredentials,
      json: true,
      qs: query
    });
    this.setState({runningRequest: r, busy: true, error: null});
    var self = this;
    r.then(function(response) {
      if (response.statusCode === 200) {
        var results = [];
        if (offset) {
          Array.prototype.push.apply(results, self.state.results);
        }
        Array.prototype.push.apply(results, response.body);
        self.setState({
          busy: false,
          error: null,
          results: results,
          runningRequest: null,
          endReached: !response.body.length
        }, self._loadMoreResults);
        return null;
      } else {
        self.setState({busy: false, error: response.body, runningRequest: null});
      }
    }).catch(function(error) {
      self.setState({busy: false, error: error.message, runningRequest: null});
    });
  },
  _loadMoreResults: function() {
    if (this._isInNextPageZone() && !this.state.busy && !this.state.endReached) {
      this._doSearch(this.state.results.length);
    }
  },
  componentWillMount: function() {
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(this.props.location.query, {
      replace: true,
      delayed: false
    });
    this._doSearch();
  },
  componentWillReceiveProps: function(nextProps) {
    var urlQueryChanged = !_.isEqual(nextProps.location.query, this.props.location.query);
    if (urlQueryChanged) {
      this.setState({workingQuery: nextProps.location.query});
    }
  },
  componentWillUpdate: function(nextProps, nextState) {
    if (!this._useManualApply()) {
      var workingQueryChanged = !_.isEqual(nextState.workingQuery, this.state.workingQuery);
      var urlQueryIsBehindWorkingQuery = !_.isEqual(nextState.workingQuery, nextProps.location.query);
      if (workingQueryChanged && urlQueryIsBehindWorkingQuery) {
        this._correctUrlQuery(nextState.workingQuery, {
          replace: false,
          delayed: true
        });
      }
    }
  },
  componentDidUpdate: function(prevProps, prevState) {
    var urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query);
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true,
        delayed: false
      });
      this._doSearch();
    }
  },
  componentDidMount: function() {
    appScroll.addListener(this._onScroll);
  },
  componentWillUnmount: function() {
    appScroll.removeListener(this._onScroll);
  },
  _isInNextPageZone: function () {
    var element = this.refs.caboose;
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight;
    } else {
      return false;
    }
  },
  _onScroll: function (event) {
    return this._loadMoreResults();
  },
  _onApply: function(event) {
    event.preventDefault();
    this._correctUrlQuery(this.state.workingQuery, {
      replace: false,
      delayed: false
    });
  },
  _onRevert: function(event) {
    event.preventDefault();
    this.setState({workingQuery: this.props.location.query});
  },
  render: function() {
    var caboose = null;
    if (this.state.endReached) {
      if (!this.state.results.length) {
        caboose = (
          <li className='caboose' ref='caboose'>
            no results
          </li>
        );
      }
    } else {
      caboose = (
        <li className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </li>
      );
    }
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
          <label>
            sort by
            <select ref='sortBy' value={this.state.workingQuery.sortBy}>
              <option value='emailAddress'>
                email address
              </option>
              <option value='givenName'>
                first name
              </option>
              <option value='familyName'>
                last name
              </option>
            </select>
          </label>
          <label>
            <input type='checkbox' ref='sortOrderDescending' checked={this.state.workingQuery.sortOrder === 'descending'}/>
            descending
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
            return <Entry user={user} key={user.id}/>;
          })}
          {caboose}
        </ol>
      </div>
    );
  }
});

var Entry = React.createClass({

  render: function() {
    var user = this.props.user;
    return (
      <li className='user'>
        <div className='name'>
          {user.givenName} {user.familyName}
        </div>
        <div className='emailAddress'>
          {user.emailAddress}
        </div>
      </li>
    );
  }

});

module.exports = Users;
