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

// https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/UnitBezier.h
/*
 * Copyright (C) 2008 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
class UnitBezier {
    CUBIC_BEZIER_SPLINE_SAMPLES = 11

    // Servo 1e-6 https://searchfox.org/mozilla-central/rev/7ff7fe028c99154cac1bf7ad9c76eb8613f412d1/servo/components/style/bezier.rs#127
    // WebKit 1e-7 https://github.com/WebKit/WebKit/blob/57d42a4b3757962b89cc88e7da3ae63ac38eba32/Source/WebCore/platform/graphics/UnitBezier.h#L39
            
    kBezierEpsilon = 1e-7
    kMaxNewtonIterations = 4

    ax = 0.0
    bx = 0.0
    cx = 0.0
    ay = 0.0
    by = 0.0
    cy = 0.0
    startGradient = 0.0
    endGradient = 0.0

    splineSamples = []

    constructor(p1x, p1y, p2x, p2y) {
        this.cx = 3.0 * p1x
        this.bx = 3.0 * (p2x - p1x) - this.cx
        this.ax = 1.0 - this.cx - this.bx

        this.cy = 3.0 * p1y
        this.by = 3.0 * (p2y - p1y) - this.cy
        this.ay = 1.0 - this.cy - this.by

        if (p1x > 0) this.startGradient = p1y / p1x
        else if (!p1y && p2x > 0) this.startGradient = p2y / p2x
        else if (!p1y && !p2y) this.startGradient = 1
        else this.startGradient = 0
        if (p2x < 1) this.endGradient = (p2y - 1) / (p2x - 1)
        else if (p2y == 1 && p1x < 1) this.endGradient = (p1y - 1) / (p1x - 1)
        else if (p2y == 1 && p1y == 1) this.endGradient = 1
        else this.endGradient = 0

        const deltaT = 1.0 / (this.CUBIC_BEZIER_SPLINE_SAMPLES - 1)
        for (let i = 0; i < this.CUBIC_BEZIER_SPLINE_SAMPLES; i++) this.splineSamples.push(this.sampleCurveX(i * deltaT))
    }

    sampleCurveX(t) {
        return ((this.ax * t + this.bx) * t + this.cx) * t
    }

    sampleCurveY(t) {
        return ((this.ay * t + this.by) * t + this.cy) * t
    }

    sampleCurveDerivativeX(t) {
        return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx
    }

    solveCurveX(x, epsilon) {
        let t0 = 0.0
        let t1 = 0.0
        let t2 = x
        let x2 = 0.0
        let d2 = 0.0
        let i = 0

        const deltaT = 1.0 / (this.CUBIC_BEZIER_SPLINE_SAMPLES - 1)
        for (i = 1; i < this.CUBIC_BEZIER_SPLINE_SAMPLES; i++) {
            if (x <= this.splineSamples[i]) {
                t1 = deltaT * i
                t0 = t1 - deltaT
                t2 = t0 + ((t1 - t0) * (x - this.splineSamples[i - 1])) / (this.splineSamples[i] - this.splineSamples[i - 1])
                break
            }
        }

        // Perform a few iterations of Newton's method -- normally very fast.
        // See https://en.wikipedia.org/wiki/Newton%27s_method.
        const newtonEpsilon = Math.min(this.kBezierEpsilon, epsilon)
        for (i = 0; i < this.kMaxNewtonIterations; i++) {
            x2 = this.sampleCurveX(t2) - x
            if (Math.abs(x2) < newtonEpsilon) return t2
            d2 = this.sampleCurveDerivativeX(t2)
            if (Math.abs(d2) < this.kBezierEpsilon) break
            t2 = t2 - x2 / d2
        }
        if (Math.abs(x2) < epsilon) return t2

        // Fall back to the bisection method for reliability.
        while (t0 < t1) {
            x2 = this.sampleCurveX(t2)
            if (Math.abs(x2 - x) < epsilon) return t2
            if (x > x2) t0 = t2
            else t1 = t2
            t2 = (t1 + t0) * 0.5
        }

        // Failure.
        return t2
    }

    solve(x, epsilon) {
        if (x < 0.0) return 0.0 + this.startGradient * x
        if (x > 1.0) return 1.0 + this.endGradient * (x - 1.0)
        return this.sampleCurveY(this.solveCurveX(x, epsilon))
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
    const _cubic = new UnitBezier(...numArr.slice(7).map((n, W) => calculateScaledValue(n, W % 2 ? -1 : 0, 1, false)))
    const currentTime = Math.round(frameTime / 10) * 10
    // console.log('currentTime', currentTime)
    const cubicValue = _cubic.solve(currentTime / totalTime, 1e-7)
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
