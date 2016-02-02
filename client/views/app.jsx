'use strict'
const appInfo = require('../../appInfo.json')
const React = require('react')
const { Link, IndexLink } = require('react-router')
const classnames = require('classnames')
const { connect } = require('react-redux')

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hamburgerExpanded: false
    }
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
    let headerNavClasses = classnames({
      hamburgerExpanded: this.state.hamburgerExpanded
    })
    let result = (
      <div>
        <header>
          <Link to='/'>
            <h1>
              {appInfo.name}
            </h1>
          </Link>
          <nav className={headerNavClasses}>
            <div className='hamburgerButton' onClick={this._onHamburgerClick}>
              ≡
            </div>
            <IndexLink activeClassName='active' to='/' onClick={this._onNavClick}>
              home
            </IndexLink>
            <Link activeClassName='active' to='/users' onClick={this._onNavClick}>
              users
            </Link>
            <Link activeClassName='active' to='/blog' onClick={this._onNavClick}>
              blog
            </Link>
            <div className='spacer'></div>
            {this.props.authUser
              ? (
                <Link activeClassName='active' to='/logOut' onClick={this._onNavClick}>
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
          {this.props.authUser ? (
            <div id='authIndicator'>
              <Link to={'/users/' + this.props.authUser.id}>
                <span className='icon-user'/>
                &nbsp;
                {this.props.authUser.givenName} {this.props.authUser.familyName}
              </Link>
            </div>
          ) : null}
          {this.props.children}
        </main>
        <footer>
        </footer>
      </div>
    )
    return result
  }
}
App.propTypes = {
  authUser: React.PropTypes.object
}
App.defaultProps = {
  authUser: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser
    }
  },
  null
)(App)

module.exports = wrapped
