'use strict'
var _ = require('lodash')
var React = require('react')
var ReactRouter = require('react-router')
var Link = ReactRouter.Link
var BusyIndicator = require('./busyIndicator.jsx')
var TitleMixin = require('./titleMixin')
var appScroll = require('../utilities/appScroll')
var ajax = require('../utilities/ajax')
var auth = require('../flux/auth')

var Users = React.createClass({
  mixins: [TitleMixin('user search')],
  getInitialState: function() {
    return {
      authUser: null,
      error: null,
      queryUpdateTimeout: null,
      workingQuery: this.props.location.query,
      results: [],
      endReached: false
    }
  },
  // Are we redirecting after input or waiting until the user manually clicks "apply"?
  _useManualApply: function() {
    // Borrowed from rackt/history/modules/DOMUtils.supportsHistory
    var ua = navigator.userAgent
    if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) {
      return true
    }
    if (ua.indexOf('CriOS') !== -1) {
      return true
    }
    return !window.history || !window.history.pushState

  },
  _loadAuthUser: function () {
    var credentials = auth.getCredentials()
    if (credentials) {
      var r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      })
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      })
      var self = this
      return r.then(function (response) {
        if (response.statusCode === 200) {
          self.setState({
            authUser: response.body
          })
        } else {
          self.setState({
            serverError: response.body
          })
        }
        return null
      }).catch(function (error) {
        self.setState({
          serverError: error.message
        })
      })
    } else {
      return Promise.resolve()
    }
  },
  // Read the search parameters from the controls and use them to construct the working query.
  _updateWorkingQuery: function() {
    // Collect the search parameters from the controls.
    var parameters = {
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value,
      emailAddress: this.refs.emailAddress ? this.refs.emailAddress.value : undefined,
      sortBy: this.refs.sortBy.value,
      sortOrder: this.refs.sortOrderDescending.checked ? 'descending' : 'ascending'
    }
    this.setState({workingQuery: parameters})
  },
  // Correct any errors in the provided query.
  _correctUrlQuery: function(query, options) {
    var delayed = options && !!options.delayed
    var replace = options && !!options.replace
    var validQuery = {}
    // Only these parameters can be filtered on.
    var validFilter = ['familyName', 'givenName', 'emailAddress']
    for (var i in validFilter) {
      var parameter = validFilter[i]
      if (query[parameter]) {
        validQuery[parameter] = query[parameter]
      }
    }
    // sortBy has valid values and a default.
    var validSortBy = ['familyName', 'givenName', 'emailAddress']
    if (!query.sortBy || (validSortBy.indexOf(query.sortBy) == -1)) {
      validQuery.sortBy = validSortBy[0]
    } else {
      validQuery.sortBy = query.sortBy
    }
    // sortOrder has valid values and a default.
    var validSortOrder = ['ascending', 'descending']
    if (!query.sortOrder || (validSortOrder.indexOf(query.sortOrder) == -1)) {
      validQuery.sortOrder = validSortOrder[0]
    } else {
      validQuery.sortOrder = query.sortOrder
    }
    var navigate = this.props.history[replace
        ? 'replaceState'
        : 'pushState']
    var self = this
    var doRedirect = function() {
      if (!_.isEqual(query, validQuery)) {
        navigate(null, self.props.location.pathname, validQuery)
      }
      if (self.state.queryUpdateTimeout) {
        self.setState({queryUpdateTimeout: null})
      }
    }
    if (this.state.queryUpdateTimeout) {
      clearTimeout(this.state.queryUpdateTimeout)
    }
    // If the valid query differs from the supplied query, redirect to it.
    if (delayed) {
      // Delay the query update to one second after the most recent edit.
      var queryUpdateTimeout = setTimeout(doRedirect, 500)
      this.setState({queryUpdateTimeout: queryUpdateTimeout})
    } else {
      doRedirect()
    }
  },
  // Initiate a search from the URL query.
  _doSearch: function(offset) {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel()
    }
    var authCredentials = auth.getCredentials()
    var query = _.cloneDeep(this.props.location.query)
    if (offset) {
      query.offset = offset
    }
    var r = ajax({
      method: 'GET',
      uri: '/api/users',
      auth: authCredentials,
      json: true,
      qs: query
    })
    this.setState({
      runningRequest: r,
      error: null
    })
    var self = this
    r.then(function(response) {
      if (response.statusCode === 200) {
        var results = []
        if (offset) {
          Array.prototype.push.apply(results, self.state.results)
        }
        Array.prototype.push.apply(results, response.body)
        self.setState({
          error: null,
          results: results,
          runningRequest: null,
          endReached: !response.body.length
        }, self._loadMoreResults)
        return null
      } else {
        self.setState({
          error: response.body,
          runningRequest: null
        })
      }
    }).catch(function(error) {
      self.setState({
        error: error.message,
        runningRequest: null
      })
    })
  },
  _loadMoreResults: function() {
    if (this._isInNextPageZone() && !this.state.runningRequest && !this.state.endReached) {
      this._doSearch(this.state.results.length)
    }
  },
  componentWillMount: function() {
    // Correct the URL query if it's invalid.
    var self = this
    this._loadAuthUser().then(function () {
      self._correctUrlQuery(self.props.location.query, {
        replace: true,
        delayed: false
      })
      self._doSearch()
    })
  },
  componentWillReceiveProps: function(nextProps) {
    var urlQueryChanged = !_.isEqual(nextProps.location.query, this.props.location.query)
    if (urlQueryChanged) {
      this.setState({workingQuery: nextProps.location.query})
    }
  },
  componentWillUpdate: function(nextProps, nextState) {
    if (!this._useManualApply()) {
      var workingQueryChanged = !_.isEqual(nextState.workingQuery, this.state.workingQuery)
      var urlQueryIsBehindWorkingQuery = !_.isEqual(nextState.workingQuery, nextProps.location.query)
      if (workingQueryChanged && urlQueryIsBehindWorkingQuery) {
        this._correctUrlQuery(nextState.workingQuery, {
          replace: false,
          delayed: true
        })
      }
    }
  },
  componentDidUpdate: function(prevProps, prevState) {
    var urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query)
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true,
        delayed: false
      })
      this._doSearch()
    }
  },
  componentDidMount: function() {
    appScroll.addListener(this._onScroll)
  },
  componentWillUnmount: function() {
    appScroll.removeListener(this._onScroll)
  },
  _isInNextPageZone: function () {
    var element = this.refs.caboose
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight
    } else {
      return false
    }
  },
  _onScroll: function (event) {
    return this._loadMoreResults()
  },
  _onApply: function(event) {
    event.preventDefault()
    this._correctUrlQuery(this.state.workingQuery, {
      replace: false,
      delayed: false
    })
  },
  _onRevert: function(event) {
    event.preventDefault()
    this.setState({workingQuery: this.props.location.query})
  },
  render: function() {
    var caboose = null
    var authUser = this.state.authUser
    if (this.state.endReached) {
      if (!this.state.results.length) {
        caboose = (
          <div className='caboose' ref='caboose'>
            no results
          </div>
        )
      }
    } else {
      caboose = (
        <div className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </div>
      )
    }
    return (
      <div id='userSearch'>
        <form id='filter' onChange={this._updateWorkingQuery}>
          {(authUser && authUser.admin) ? (
            <label>
              email address
              <input type='text' ref='emailAddress' value={this.state.workingQuery.emailAddress}/>
            </label>
          ) : null}
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
              {(authUser && authUser.admin) ? (
                <option value='emailAddress'>
                  email address
                </option>
              ) : null}
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
                <button onClick={this._onApply} disabled={!!this.state.runningRequest} className='highlighted'>
                  apply
                </button>
                <button onClick={this._onRevert} disabled={!!this.state.runningRequest}>
                  revert
                </button>
              </div>
            )
            : (null)}
        </form>
        <div id='userList'>
          {_.map(this.state.results, function(user) {
            return <Entry user={user} authUser={authUser} key={user.id}/>
          })}
          {caboose}
        </div>
      </div>
    )
  }
})

var Entry = React.createClass({

  render: function() {
    var user = this.props.user
    var authUser = this.props.authUser
    return (
      <Link className='user' to={'/users/' + user.id}>
        <div className='name'>
          {user.givenName} {user.familyName}
        </div>
        {(user.emailAddress) ? (
          <div className='emailAddress'>
            {user.emailAddress}
          </div>
        ) : null}
      </Link>
    )
  }

})

module.exports = Users
