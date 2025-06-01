import cryptoHandle from 'crypto-helper'
import { JSDOM } from 'jsdom'

const keyWord = 'obfiowerehiring'
const ADDITIONAL_RANDOM_NUMBER = 3
const totalTime = 4096

export const GenerateHeader = async (path, method, webGuestTokenExt = {}) => {
    const keyBytes = webGuestTokenExt.twitter_site_verification || []
    const _2d_array = webGuestTokenExt._2d_array || []
    const row_index = webGuestTokenExt.row_index || -1
    const key_bytes_indices = webGuestTokenExt.key_bytes_indices || []

    if (!keyBytes?.length || !_2d_array?.length || row_index < 0 || key_bytes_indices.length !== 3) {
        return ''
    }

    const animationStr = setAnimationStr(keyBytes, _2d_array, row_index, key_bytes_indices)
    const fixedTime = Math.floor((Date.now() - 1682924400 * 1000) / 1000)
    const bytesTime = timeToBytes(fixedTime)

    const payload = `${method.toUpperCase()}!${path}!${fixedTime}${keyWord}${animationStr.join('')}`
    const hash = Array.from(new Uint8Array(await sha256(new TextEncoder().encode(payload))))

    // console.log(payload, hash)

    const xorByte = Math.floor(256 * Math.random())
    const bytes = [xorByte, ...keyBytes, ...bytesTime, ...hash.slice(0, 16), ADDITIONAL_RANDOM_NUMBER]

    const xorBytes = Array.from(bytes.length)
    xorBytes[0] = xorByte
    for (let i = 1; i < bytes.length; i++) {
        xorBytes[i] = bytes[i] ^ xorByte
    }

    return encode(xorBytes)
}

// cubic
// https://github.com/web-animations/web-animations-js/blob/480630912ad1e6e1b462363a88c0b8e93b5168fb/src/timing-utilities.js#L172-L210
function cubic(a, b, c, d) {
    if (a < 0 || a > 1 || c < 0 || c > 1) {
        return function (x) {
            return x
        }
    }
    return function (x) {
        if (x <= 0) {
            var start_gradient = 0
            if (a > 0) start_gradient = b / a
            else if (!b && c > 0) start_gradient = d / c
            return start_gradient * x
        }
        if (x >= 1) {
            var end_gradient = 0
            if (c < 1) end_gradient = (d - 1) / (c - 1)
            else if (c == 1 && a < 1) end_gradient = (b - 1) / (a - 1)
            return 1 + end_gradient * (x - 1)
        }

        var start = 0,
            end = 1
        function f(a, b, m) {
            const _1_m = 1 - m
            return 3 * a * _1_m * _1_m * m + 3 * b * _1_m * m * m + m * m * m
        }
        while (start < end) {
            var mid = start + (end - start) / 2
            var xEst = f(a, c, mid)
            // Servo 1e-6 https://searchfox.org/mozilla-central/rev/7ff7fe028c99154cac1bf7ad9c76eb8613f412d1/servo/components/style/bezier.rs#127
            // WebKit 1e-7 https://github.com/WebKit/WebKit/blob/57d42a4b3757962b89cc88e7da3ae63ac38eba32/Source/WebCore/platform/graphics/UnitBezier.h#L39
            if (Math.abs(x - xEst) < 1e-6) {
                return f(b, d, mid)
            }
            if (xEst < x) {
                start = mid
            } else {
                end = mid
            }
        }
        return f(b, d, mid)
    }
}

function trimRight(str, char) {
    if (str.endsWith(char)) {
        return str.slice(0, str.indexOf(char))
    } else {
        return str
    }
}

function encode(n) {
    return trimRight(
        btoa(
            Array.from(n)
                .map((n) => String.fromCharCode(n))
                .join('')
        ),
        '='
    )
}
function interpolate(from, to, value) {
    const out = Array.from(from.length)
    for (let i = 0; i < from.length; i++) {
        out[i] = interpolateNum(from[i], to[i], value)
    }
    return out
}

function interpolateNum(from, to, value) {
    return from * (1 - value) + to * value
}

function convertRotationToMatrix(degrees) {
    // ! first convert degrees to radians
    const radians = (degrees * Math.PI) / 180
    // ! now we do this:
    /*
		[cos(r), -sin(r), 0]
		[sin(r), cos(r), 0]

		in this order:
		[cos(r), sin(r), -sin(r), cos(r), 0, 0]
	*/
    const c = Math.cos(radians).toFixed(6)
    const s = Math.sin(radians).toFixed(6)
    return [c, s, -s, c, 0, 0]
}

function doAnimation(numArr, frameTime) {
    // console.log(numArr[6], 60, 360, !0)
    // console.log(...numArr.slice(7).map((n, W) => calculateScaledValue(n, W % 2 ? -1 : 0, 1, false)))
    const _cubic = cubic(...numArr.slice(7).map((n, W) => calculateScaledValue(n, W % 2 ? -1 : 0, 1, false)))
    const currentTime = Math.round(frameTime / 10) * 10
    // console.log('currentTime', currentTime)
    const cubicValue = _cubic(currentTime / totalTime)
    // console.log('cubicValue', cubicValue)
    const frameColor = interpolate([numArr[0], numArr[1], numArr[2]], [numArr[3], numArr[4], numArr[5]], cubicValue)
    const frameRotate = interpolate([0], [calculateScaledValue(numArr[6], 60, 360, !0)], cubicValue)
    const frameMatrix = convertRotationToMatrix(frameRotate)
    // console.log('matrix', frameMatrix)

    return {
        color: frameColor.map((c) => Math.round(c)),
        transform: frameMatrix.slice(0, 4).map((m) => Number(Number(m).toFixed(2)))
    }
}

const calculateScaledValue = (scalingFactor, baseValue, targetValue, roundToInteger) => {
    const result = (scalingFactor * (targetValue - baseValue)) / 255 + baseValue
    return roundToInteger ? Math.floor(result) : Number(result.toFixed(2))
}
const setAnimationStr = (key, _2d_array, row_index, key_bytes_indices) => {
    const [index, frameTime] = [key[row_index] % 16, (key[key_bytes_indices[0]] % 16) * (key[key_bytes_indices[1]] % 16) * (key[key_bytes_indices[2]] % 16)]
    const style = doAnimation(_2d_array[index], frameTime)
    // console.log(style)

    const hexArray = Array.from(style.color.length + style.transform.length + 2)
    hexArray[7] = hexArray[8] = '0'
    for (let i = 0; i < 3; i++) {
        const numColorValue = style.color[i]
        if (numColorValue >= 0 && numColorValue <= 255) {
            hexArray[i] = numColorValue.toString(16)
        } else if (numColorValue < 0) {
            hexArray[i] = '0'
        } else {
            hexArray[i] = 'ff'
        }
    }
    for (let i = 0; i < 4; i++) {
        let numMatrixValue = style.transform[i]
        if (numMatrixValue < 0) {
            numMatrixValue = -numMatrixValue
        }
        // console.log(numMatrixValue, i)
        if (numMatrixValue > 0 && numMatrixValue < 1) {
            hexArray[i + 3] = numMatrixValue.toString(16).replace('.', '')
        } else if (numMatrixValue <= 0) {
            hexArray[i + 3] = '0'
        } else {
            hexArray[i + 3] = '1'
        }
    }
    return hexArray
}
function sha256(textEncoder) {
    return cryptoHandle.subtle.digest('sha-256', textEncoder)
}
function timeToBytes(val) {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setUint32(0, val, true)
    return Array.from(new Uint8Array(buffer))
}

function GetFrame(curFrame = '') {
    if (!curFrame || curFrame.length < 9) {
        return []
    }
    return curFrame
        .substring(9)
        .split('C')
        .map((n) =>
            n
                .replace(/[^\d]+/g, ' ')
                .trim()
                .split(' ')
                .map(Number)
        )
}
export function ParseTwitterMainPage(strPage = '', objValue = {}) {
    const dom = new JSDOM(strPage)
    const content = dom.window.document.querySelector('[name^=tw]')?.getAttribute('content') || ''
    objValue.twitter_site_verification = Array.from(new Uint8Array(base64_to_buffer(content)))

    if (objValue.twitter_site_verification.length >= 6) {
        // document.querySelectorAll('[id^=loading-x-anim-]:nth-of-type(2)>g>path:nth-child(2)')
        // [...document.querySelectorAll('[id^=loading-x-anim-]>g>path:nth-child(2)')].map(node => node.getAttribute('d'))
        // log.Println("[id^=loading-x-anim-]:nth-of-type(", strconv.Itoa(int(objValue.twitter_site_verification[5]%4+1)), ")>g>path:nth-child(2)")
        const _2d_array = dom.window.document.querySelector(`[id^=loading-x-anim-]:nth-of-type(${(objValue.twitter_site_verification[5] % 4) + 1})>g>path:nth-child(2)`)?.getAttribute('d') || ''
        objValue._2d_array = GetFrame(_2d_array)
    } else {
        objValue._2d_array = []
    }

    const guestTokenMatch = strPage.match(/document\.cookie="gt=(\d+);/)
    if (guestTokenMatch) {
        objValue.guest_token = guestTokenMatch[1]
    }

    const ondemandSHexMatch = strPage.match(/"ondemand\.s":"([0-9a-f]+)"/)
    if (ondemandSHexMatch) {
        objValue.ondemand_s_hex = ondemandSHexMatch[1]
    }

    // if (!objValue.ondemand_s_hex) {
    //     throw new Error('invalid ondemand_s_hex')
    // }

    return objValue
}

// let OndemandSValueCache = {}

export function ParseOndemandS(fileStr = '', objValue = {}) {
    if (!objValue) {
        objValue.row_index = -1
    }
    if (objValue?.key_bytes_indices?.length !== 3) {
        objValue.key_bytes_indices = new Array(3)
    }

    const regex = /\(\w{1}\[(\d{1,2})\],\s*16\)/gm

    let m
    let i = 0

    while ((m = regex.exec(fileStr)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++
        }

        if (i === 0) {
            objValue.row_index = m[1]
        } else {
            objValue.key_bytes_indices[i - 1] = m[1]
        }
        i++
    }

    // OndemandSValueCache[objValue.ondemand_s_hex] = [objValue.row_index, objValue.key_bytes_indices[0], objValue.key_bytes_indices[1], objValue.key_bytes_indices[2]]

    return objValue
}

const base64_to_buffer = (base64) => {
    let binaryString = atob(base64)
    let bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
}
