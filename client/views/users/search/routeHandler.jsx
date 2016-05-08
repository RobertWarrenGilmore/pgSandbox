'use strict'
const React = require('react')
const GenericSearch = require('../../genericSearch.jsx')
const FilterControls = require('./filterControls.jsx')
const { Link } = require('react-router')
const UserProfile = require('../profile.jsx')
const { connect } = require('react-redux')
const { search: searchUsers } = require('../../../flux/users/actions')
const Helmet = require('react-helmet')

class UserSearch extends React.Component {
  static proptypes = {
    authUser: React.PropTypes.object,
    users: React.PropTypes.object,
    searchUsers: React.PropTypes.func.isRequired,
    history: React.PropTypes.object.isRequired,
    location: React.PropTypes.object.isRequired
  };
  static defaultProps = {
    authUser: null,
    users: null,
    searchUsers: null,
    history: null,
    location: null
  };
  constructor(props) {
    super(props)
    this._correctUrlQuery = this._correctUrlQuery.bind(this)
    this._performSearch = this._performSearch.bind(this)
    this._renderResult = this._renderResult.bind(this)
  }
  // Correct any errors in the provided query.
  _correctUrlQuery(query = {}) {
    let validQuery = {}
    // Only these parameters can be filtered on.
    const validFilter = ['familyName', 'givenName', 'emailAddress']
    for (let i in validFilter) {
      let parameter = validFilter[i]
      if (query[parameter]) {
        validQuery[parameter] = query[parameter]
      }
    }
    // sortBy has valid values and a default.
    const validSortBy = ['familyName', 'givenName', 'emailAddress']
    if (!query.sortBy || (validSortBy.indexOf(query.sortBy) == -1)) {
      validQuery.sortBy = validSortBy[0]
    } else {
      validQuery.sortBy = query.sortBy
    }
    // sortOrder has valid values and a default.
    const validSortOrder = ['ascending', 'descending']
    if (!query.sortOrder || (validSortOrder.indexOf(query.sortOrder) == -1)) {
      validQuery.sortOrder = validSortOrder[0]
    } else {
      validQuery.sortOrder = query.sortOrder
    }

    return validQuery
  }
  _performSearch(query) {
    return this.props.searchUsers(query)
  }
  _renderResult(result) {
    const userId = result
    const {
      users
    } = this.props
    return (
      <Link className='user' to={`/users/${userId}`}>
        <UserProfile user={users[userId]} brief={true} key={userId}/>
      </Link>
    )
  }
  render() {
    const {
      _performSearch,
      _renderResult,
      _correctUrlQuery,
      props: {
        authUser,
        history,
        location
      }
    } = this
    return (
      <div id='userSearch'>
        <Helmet title='user search'/>
        <GenericSearch
          filterControls={
            <FilterControls
              authUser={authUser}
            />
          // TODO GenericSearch will use cloneElement to add props like workingQuery, showApplyButton, and onApply to the filterControls element.
          }
          performSearch={_performSearch}
          renderResult={_renderResult}
          correctUrlQuery={_correctUrlQuery}
          history={history}
          location={location}
        />
      </div>
    )
  }
}

const wrapped = connect(
  function mapStateToProps(state) {
    state = state.asMutable({deep: true})
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser,
      users: state.users
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      searchUsers: query => dispatch(searchUsers(query))
    }
  }
)(UserSearch)

module.exports = wrapped
