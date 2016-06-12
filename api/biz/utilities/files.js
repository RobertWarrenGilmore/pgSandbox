'use strict'

const dataUrlParts = dataUrl => {
  const match = dataUrl.match(/^data:(.*);base64,([0-9a-zA-Z\+\/]*={0,2})$/)
  if (match === null)
    return null
  else
    return {
      type: match[1],
      data: match[2]
    }
}

const dataUrlToByteaInput = dataUrl => {
  const base64Data = dataUrlParts(dataUrl).data
  const hexData = Buffer.from(base64Data, 'base64').toString('hex')
  return '\\x' + hexData
}

const byteaOuputToDataUrl = (bytea, type) => {
  if (!type)
    type = ''
  const base64Data = bytea.toString('base64')
  return `data:${type};base64,${base64Data}`
}

module.exports = {
  dataUrlParts,
  dataUrlToByteaInput,
  byteaOuputToDataUrl
}
