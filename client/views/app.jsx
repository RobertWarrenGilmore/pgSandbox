'use strict'
const appInfo = require('../../appInfo.json')
const React = require('react')
const { Link, IndexLink } = require('react-router')
const classnames = require('classnames')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')
const Avatar = require('./users/avatar.jsx')
const TimeZonePicker = require('./timeZonePicker.jsx')
const { setTimeZone: setTimeZoneAction } = require('../flux/timeZone/actions')

class App extends React.Component {
  static propTypes = {
    authUser: React.PropTypes.object,
    timeZone: React.PropTypes.string.isRequired,
    setTimeZone: React.PropTypes.func.isRequired
  };
  static defaultProps = {
    authUser: undefined,
    timeZone: undefined,
    setTimeZone: undefined
  };
  state = {
    hamburgerExpanded: false
  };
  constructor(props) {
    super(props)
    this._onHamburgerClick = this._onHamburgerClick.bind(this)
    this._onNavClick = this._onNavClick.bind(this)
  }
  _onHamburgerClick() {
    this.setState({
      hamburgerExpanded: !this.state.hamburgerExpanded
    })
  }
  _onNavClick() {
    this.setState({
      hamburgerExpanded: false
    })
  }
  render() {
    const {
      props: {
        authUser,
        timeZone,
        setTimeZone,
        children
      },
      state: {
        hamburgerExpanded
      },
      _onHamburgerClick,
      _onNavClick
    } = this
    let headerNavClasses = classnames({
      hamburgerExpanded
    })
    let result = (
      <div>
        <Helmet
          title='home'
          titleTemplate={appInfo.name + ' - %s'}
          />
        <header>
          <Link to='/'>
            <h1>
              {appInfo.name}
            </h1>
          </Link>
          <nav className={headerNavClasses}>
            <div className='hamburgerButton' onClick={_onHamburgerClick}>
              ≡
            </div>
            <IndexLink activeClassName='active' to='/' onClick={_onNavClick}>
              home
            </IndexLink>
            <Link activeClassName='active' to='/users' onClick={_onNavClick}>
              users
            </Link>
            <Link activeClassName='active' to='/blog' onClick={_onNavClick}>
              blog
            </Link>
            <div className='spacer'></div>
            {this.props.authUser
              ? (
                <Link activeClassName='active' to='/logOut' onClick={_onNavClick}>
                  log out
                </Link>
              )
              : ([
                <Link activeClassName='active' key='navLogIn' to='/logIn' onClick={this._onNavClick}>
                  log in
                </Link>,
                <Link activeClassName='active' key='navRegister' to='/register' onClick={this._onNavClick}>
                  register
                </Link>
              ])}
          </nav>
        </header>
        <main>
          {authUser ? (
            <div id='authIndicator'>
              {(authUser && authUser.admin) ? (
                <TimeZonePicker
                  value={timeZone}
                  onChange={setTimeZone}
                  title='admin time zone view'
                  />
              ) : null}
              <Link to={'/users/' + authUser.id}>
                <Avatar id={authUser.id}/>
                &nbsp;
                {authUser.givenName} {authUser.familyName}
              </Link>
            </div>
          ) : null}
          {children}
        </main>
        <footer>
        </footer>
      </div>
    )
    return result
  }
}

const wrapped = connect(
  function mapStateToProps(state) {
    state = state.asMutable({deep: true})
    let authUser
    if (state.auth.id && state.users.cache) {
      authUser = state.users.cache[state.auth.id]
    }
    return {
      authUser,
      timeZone: state.timeZone
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      setTimeZone: (timeZone) => dispatch(setTimeZoneAction(timeZone))
    }
  }
)(App)

module.exports = wrapped
