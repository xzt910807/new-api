/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, test } from 'vitest'

import { ERROR_MESSAGES } from '../../constants'
import { parseRequestErrorDetails } from './request-error-utils'

describe('parseRequestErrorDetails', () => {
  test('extracts the message from OpenAI-style relay error payloads', () => {
    const error = {
      message: 'Request failed with status code 403',
      response: {
        data: {
          error: {
            message: '用户额度不足, 剩余额度: ¥0.000000',
            type: 'new_api_error',
            code: 'insufficient_user_quota',
          },
        },
      },
    }

    expect(parseRequestErrorDetails(error)).toEqual({
      errorCode: 'insufficient_user_quota',
      errorMessage: '用户额度不足, 剩余额度: ¥0.000000',
    })
  })

  test('extracts the message from admin API payloads', () => {
    const error = {
      message: 'Request failed with status code 400',
      response: {
        data: {
          success: false,
          message: 'Invalid parameters',
        },
      },
    }

    expect(parseRequestErrorDetails(error)).toEqual({
      errorCode: undefined,
      errorMessage: 'Invalid parameters',
    })
  })

  test('falls back to the axios message when the payload has no message', () => {
    const error = {
      message: 'Network Error',
      response: { data: {} },
    }

    expect(parseRequestErrorDetails(error).errorMessage).toBe('Network Error')
  })

  test('uses the default fallback for errors without any message', () => {
    expect(parseRequestErrorDetails(null).errorMessage).toBe(
      ERROR_MESSAGES.API_REQUEST_ERROR
    )
  })

  test('uses the caller-provided fallback when no message exists', () => {
    expect(
      parseRequestErrorDetails({}, 'Failed to load playground models')
        .errorMessage
    ).toBe('Failed to load playground models')
  })
})
