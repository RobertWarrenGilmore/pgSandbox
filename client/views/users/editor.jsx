'use strict'
const _ = require('lodash')
const React = require('react')
const update = require('react-addons-update')
const BusyIndicator = require('../busyIndicator.jsx')
const ErrorMessage = require('../errorMessage.jsx')
const Avatar = require('./avatar.jsx')
const FileInput = require('../fileInput.jsx')

const UserEditor = props => {

  const {
    user,
    dirty,
    disabled,
    adminMode,
    onSave,
    onRevert,
    onChange,
    fieldErrors,
    error
  } = props

  const _onChangeText = fieldName => ({target: {value}}) =>
    onChange(update(user, {
      [fieldName]: value || undefined
    }))

  const _onChangeCheckbox = fieldName => ({target: {checked}}) =>
    onChange(update(user, {
      [fieldName]: !!checked
    }))

  const _onChooseAvatar = filePromises =>
    onChange(update(user, {
      avatar: {$set: filePromises.length ? 'loading' : undefined}
    }))

  const _onLoadAvatar = files =>
    onChange(update(user, {
      avatar: {$set: files[0]}
    }))

  const _onClearAvatar = filePromises =>
    onChange(update(user, {
      avatar: {$set: null}
    }))

  const fieldErrorMessage = fieldName =>
    <ErrorMessage error={_.at(fieldErrors, fieldName)[0] || []}/>

  return (
    <div className='userEditor'>
      <header>
        <section>
          <label className='avatarChooser'>
            <Avatar
              id={user.id}
              data={user.avatar}
              />
            <FileInput
              onChoose={_onChooseAvatar}
              onLoad={_onLoadAvatar}
              disabled={disabled}
              accept={'image/png,image/jpeg,image/bmp'}
              />
            <button
              onClick={_onClearAvatar}
              disabled={disabled || user.avatar === null}
              >
              <span className='icon-bin'/>
              &nbsp;
              clear
            </button>
            {fieldErrorMessage('avatar')}
          </label>
        </section>
        <label>
          name
          <div className='nameLine'>
            <input
              type='text'
              value={user.givenName}
              placeholder='first name'
              disabled={disabled}
              onChange={_onChangeText('givenName')}
              />
            <input
              type='text'
              value={user.familyName}
              placeholder='last name'
              disabled={disabled}
              onChange={_onChangeText('familyName')}
              />
          </div>
          {fieldErrorMessage('givenName')}
          {fieldErrorMessage('familyName')}
        </label>
      </header>
      <label>
        email address
        <input
          type='email'
          value={user.emailAddress}
          placeholder='name@example.com'
          disabled={disabled}
          onChange={_onChangeText('emailAddress')}
          />
        {fieldErrorMessage('emailAddress')}
      </label>
      <div className='passwordPair'>
        <label>
          password
          <input
            type='password'
            value={user.password}
            disabled={disabled}
            onChange={_onChangeText('password')}
            />
          {fieldErrorMessage('password')}
        </label>
        <label>
          repeat password
          <input
            type='password'
            value={user.repeatPassword}
            disabled={disabled}
            onChange={_onChangeText('repeatPassword')}
            />
          {fieldErrorMessage('repeatPassword')}
        </label>
      </div>
      {adminMode ? (
          <div>
          <label>
            <input
              type='checkbox'
              checked={user.authorisedToBlog}
              disabled={disabled}
              onChange={_onChangeCheckbox('authorisedToBlog')}
              />
            authorised to blog
            {fieldErrorMessage('authorisedToBlog')}
          </label>
          <label>
            <input
              type='checkbox'
              checked={user.admin}
              disabled={disabled}
              onChange={_onChangeCheckbox('admin')}
              />
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
      <div className='actions'>
        {disabled
          ? (
            <div>
              <BusyIndicator/>
              saving
            </div>
          ) : null}
        <button
          id='save'
          disabled={disabled || !dirty || !!fieldErrors}
          onClick={onSave}
          className='highlighted'>
          <span className='icon-floppy-disk'/>
          &nbsp;
          save
        </button>
        <button
          id='revert'
          disabled={disabled || !dirty}
          onClick={onRevert}>
          <span className='icon-undo2'/>
          &nbsp;
          revert
        </button>
      </div>
    </div>
  )
}

module.exports = UserEditor
