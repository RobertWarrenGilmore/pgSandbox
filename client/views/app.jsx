'use strict'
import appInfo from '../../appInfo.json'
import React from 'react'
import {Link, IndexLink} from 'react-router'
import setWindowTitle from '../utilities/setWindowTitle'
import classnames from 'classnames'
import auth from '../flux/auth'
import ajax from '../utilities/ajax'
import {bind} from 'decko'

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      authCredentials: auth.getCredentials(),
      authUser: null,
      hamburgerExpanded: false
    }
  }
  @bind
  _loadAuthUser() {
    const credentials = this.state.authCredentials
    if (credentials) {
      let r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      })
      this.setState({
        authUser: null,
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      })
      return r.then((response) => {
        if (response.statusCode === 200) {
          this.setState({
            authUser: response.body
          })
        }
        return null
      }).catch((err) => {})
    } else {
      this.setState({
        authUser: null
      })
    }
  }
  @bind
  _authListener() {
    this.setState({
      authCredentials: auth.getCredentials()
    }, () => {
      this._loadAuthUser()
    })
  }
  componentWillMount() {
    auth.listen(this._authListener)
    this._loadAuthUser()
  }
  componentDidMount() {
    setWindowTitle()
  }
  componentWillUnmount() {
    auth.unlisten(this._authListener)
    setWindowTitle()
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
            {this.state.authCredentials
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
          {this.state.authUser ? (
            <div id='authIndicator'>
              <Link to={'/users/' + this.state.authUser.id}>
                <span className='icon-user'/>
                &nbsp;
                {this.state.authUser.givenName} {this.state.authUser.familyName}
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
  @bind
  _onHamburgerClick() {
    this.setState({
      hamburgerExpanded: !this.state.hamburgerExpanded
    })
  }
  @bind
  _onNavClick() {
    this.setState({
      hamburgerExpanded: false
    })
  }
}

export default App
