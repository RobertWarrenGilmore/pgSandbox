'use strict'
import {name as appName} from '../../appInfo.json'

export default function (title) {
  document.title = appName
  if (title && title.length) {
    document.title += ' - ' + title
  }
}
