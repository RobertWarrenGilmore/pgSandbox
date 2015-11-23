var appInfo = require('../../appInfo.json');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var IndexLink = ReactRouter.IndexLink;
var TitleMixin = require('./titleMixin');
var classnames = require('classnames');
var auth = require('../flux/auth');

var App = React.createClass({
  mixins: [TitleMixin()],
  getInitialState: function() {
    return {authCredentials: auth.getCredentials(), authBusy: auth.isBusy(), hamburgerExpanded: false};
  },
  _authListener: function() {
    this.setState({authCredentials: auth.getCredentials(), authBusy: auth.isBusy()});
  },
  componentDidMount: function() {
    auth.listen(this._authListener);
  },
  componentWillUnmount: function() {
    auth.unlisten(this._authListener);
  },
  render: function() {
    var headerNavClasses = classnames({hamburgerExpanded: this.state.hamburgerExpanded});
    var result = (
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
          {this.props.children}
        </main>
        <footer>
        </footer>
      </div>
    );
    return result;
  },
  _onHamburgerClick: function() {
    this.setState({
      hamburgerExpanded: !this.state.hamburgerExpanded
    });
  },
  _onNavClick: function() {
    this.setState({hamburgerExpanded: false});
  }
});

module.exports = App;
