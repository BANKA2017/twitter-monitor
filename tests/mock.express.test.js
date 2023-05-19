/*
  Mock express.js Node.js 18.x required
  `nvm use 18`
  Twitter Monitor v3 test
  @BANKA2017 && NEST.MOE
*/

import { expect, test } from "vitest"
import MockExpress from "./mock/express"

const mockURL = 'http://localhost/mock/test?this=fake_express_js'
const mockParams = []//TODO mock
const mockBody = 'this=fake_body'
const mockType = 'hashtag'

const mock = new MockExpress
mock.init(mockURL, mockParams, mockBody, mockType)
const {req, res} = mock


test('Init', () => {
    expect(req.url).toEqual(mockURL)
    expect(req.params).toEqual(mockParams)
    expect(req.body).toEqual(mockBody)
    expect(req.postBody).toEqual(mockBody)
    expect(req.type).toEqual(mockType)
    expect(req.query).toEqual({this: 'fake_express_js'})
})

test('Headers', () => {
    res.set('test-key-1', '1')
    expect(Object.fromEntries(mock.headers.entries())).toHaveProperty('test-key-1')
    expect(mock.headers.get('test-key-1')).toEqual('1')
    res.append('test-key-2', '1')
    expect(Object.fromEntries(mock.headers.entries())).toHaveProperty('test-key-2')
    expect(mock.headers.get('test-key-2')).toEqual('1')
    res.setHeader('test-key-1', '2')
    expect(mock.headers.get('test-key-1')).toEqual('2')
})

test('Response', async () => {
  mock.init(mockURL, mockParams, mockBody, mockType)
  expect(res.send('test_content').body).toEqual('test_content')
  mock.init(mockURL, mockParams, mockBody, mockType)
  expect(res.end().body).toEqual(null)
  mock.init(mockURL, mockParams, mockBody, mockType)
  const redirectResponse = res.redirect(307, 'http://localhost/mock/test_redirect')
  expect(redirectResponse.status).toEqual(307)
  expect(redirectResponse.redirect).toEqual('http://localhost/mock/test_redirect')
  mock.init(mockURL, mockParams, mockBody, mockType)
  expect(res.json({this: 'is_json_test'}).body).toEqual({"this":"is_json_test"})
})

test('Status', async () => {
  let statusHandle = null
  mock.init(mockURL, mockParams, mockBody, mockType)
  statusHandle = res.status(403).send('test_content')
  expect(statusHandle.status).toEqual(403)
  expect(statusHandle.body).toEqual('test_content')
  mock.init(mockURL, mockParams, mockBody, mockType)
  statusHandle = res.status(404).end()
  expect(statusHandle.body).toEqual(null)
  expect(statusHandle.status).toEqual(404)
  mock.init(mockURL, mockParams, mockBody, mockType)
  const redirectResponse = res.status(401).redirect(302, 'http://localhost/mock/test_redirect')
  expect(redirectResponse.status).toEqual(302)
  expect(redirectResponse.redirect).toEqual('http://localhost/mock/test_redirect')
  mock.init(mockURL, mockParams, mockBody, mockType)
  statusHandle = res.status(500).json({this: 'is_json_test'})
  expect(statusHandle.body).toEqual({"this":"is_json_test"})
  expect(statusHandle.status).toEqual(500)
})
