'use strict'
const _ = require('lodash')
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')
const ErrorMessage = require('../errorMessage.jsx')
const validate = require('../../../utilities/validate')
const vf = validate.funcs
const ValidationError = validate.ValidationError

class UserEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      fieldErrors: null
    }
    this._validateFields = this._validateFields.bind(this)
    this._onChange = this._onChange.bind(this)
  }
  _validateFields() {
    const { existingUser, editingUser } = this.props
    return validate(editingUser, {
      emailAddress: [
        vf.emailAddress('The email address must be, well, an email address.')
      ],
      givenName: [
        (val) => {
          if (existingUser.givenName) {
            vf.notNull('The first name cannot be removed.')(val)
            vf.notEmpty('The first name cannot be removed.')(val)
          }
        },
        vf.string('The first name must be a string.'),
        vf.maxLength('The first name must not be longer than thirty characters.', 30)
      ],
      familyName: [
        (val) => {
          if (existingUser.familyName) {
            vf.notNull('The last name cannot be removed.')(val)
            vf.notEmpty('The last name cannot be removed.')(val)
          }
        },
        vf.string('The last name must be a string.'),
        vf.maxLength('The last name must not be longer than thirty characters.', 30)
      ],
      password: [
        vf.minLength('The password must be at least eight characters long.', 8),
        vf.maxLength('The password must be at most thirty characters long.', 30)
      ],
      repeatPassword: [
        (val) => {
          if (val !== editingUser.password) {
            throw new ValidationError('The passwords must match.')
          }
        }
      ],
      admin: [
        vf.boolean('The admin setting must be a boolean.')
      ],
      authorisedToBlog: [
        vf.boolean('The blog authorisation setting must be a boolean.')
      ]
    }).then(() => this.setState({
      fieldErrors: null
    })).catch(err => this.setState({
      fieldErrors: err.messages
    }))
  }
  _onChange() {
    const userFromFields = {
      emailAddress: this.refs.emailAddress.value,
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value,
      password: this.refs.password.value || undefined,
      repeatPassword: this.refs.repeatPassword.value || undefined,
      authorisedToBlog: this.refs.authorisedToBlog ? this.refs.authorisedToBlog.checked : undefined,
      admin: this.refs.admin ? this.refs.admin.checked : undefined
    }
    this.props.onChange(userFromFields)
  }
  componentDidMount() {
    this._validateFields()
  }
  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(this.props.editingUser, prevProps.editingUser) ||
      !_.isEqual(this.props.existingUser, prevProps.existingUser)) {
      this._validateFields()
    }
  }
  render() {
    const { editingUser, disabled, onSave, onRevert, error } = this.props
    const fieldErrorMessage = fieldName => {
      const propFieldErrors = _.at(this.props.fieldErrors, fieldName)[0] || []
      const stateFieldErrors = _.at(this.state.fieldErrors, fieldName)[0] || []
      const allFieldErrors = propFieldErrors.concat(stateFieldErrors)
      return <ErrorMessage error={allFieldErrors}/>
    }
    return (
      <div className='userEditor'>
        <header>
          <label>
            name
            <div className='nameLine'>
              <input
                type='text'
                ref='givenName'
                value={editingUser.givenName}
                placeholder='first name'
                disabled={disabled}
                onChange={this._onChange}/>
              <input
                type='text'
                ref='familyName'
                value={editingUser.familyName}
                placeholder='last name'
                disabled={disabled}
                onChange={this._onChange}/>
            </div>
            {fieldErrorMessage('givenName')}
            {fieldErrorMessage('familyName')}
          </label>
        </header>
        <label>
          email address
          <input
            type='email'
            ref='emailAddress'
            value={editingUser.emailAddress}
            placeholder='name@example.com'
            disabled={disabled}
            onChange={this._onChange}/>
          {fieldErrorMessage('emailAddress')}
        </label>
        <div className='passwordPair'>
          <label>
            password
            <input
              type='password'
              ref='password'
              value={editingUser.password}
              disabled={disabled}
              onChange={this._onChange}/>
            {fieldErrorMessage('password')}
          </label>
          <label>
            repeat password
            <input
              type='password'
              ref='repeatPassword'
              value={editingUser.repeatPassword}
              disabled={disabled}
              onChange={this._onChange}/>
            {fieldErrorMessage('repeatPassword')}
          </label>
        </div>
        {!!this.props.adminMode ? (
            <div>
            <label>
              <input
                type='checkbox'
                ref='authorisedToBlog'
                checked={editingUser.authorisedToBlog}
                disabled={disabled}
                onChange={this._onChange}/>
              authorised to blog
              {fieldErrorMessage('authorisedToBlog')}
            </label>
            <label>
              <input
                type='checkbox'
                ref='admin'
                checked={editingUser.admin}
                disabled={disabled}
                onChange={this._onChange}/>
              administrator
              {fieldErrorMessage('admin')}
            </label>
          </div>
        ) : null}
        {error
          ? (
            <p className='error'>
              {error}
            </p>
          ) : null}
        {disabled
          ? (
            <div>
              <BusyIndicator/>
              saving
            </div>
          ) : null}
        <div className='actions'>
          <button
            id='save'
            disabled={disabled || !!this.props.fieldErrors}
            onClick={onSave}
            className='highlighted'>
            <span className='icon-floppy-disk'/>
            &nbsp;
            save
          </button>
          <button
            id='revert'
            disabled={disabled}
            onClick={onRevert}>
            <span className='icon-undo2'/>
            &nbsp;
            revert
          </button>
        </div>
      </div>
    )
  }
}
UserEditor.propTypes = {
  editingUser: React.PropTypes.object,
  existingUser: React.PropTypes.object,
  onChange: React.PropTypes.func,
  onSave: React.PropTypes.func,
  onRevert: React.PropTypes.func,
  disabled: React.PropTypes.bool,
  adminMode: React.PropTypes.bool,
  fieldErrors: React.PropTypes.object,
  error: React.PropTypes.string
}
UserEditor.defaultProps = {
  editingUser: null,
  existingUser: null,
  onChange: () => {},
  onSave: () => {},
  onRevert: () => {},
  disabled: false,
  adminMode: false,
  fieldErrors: null,
  error: null
}

module.exports = UserEditor
