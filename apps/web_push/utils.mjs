export const base64_to_buffer = (base64 = '') => {
    let binaryString = atob(base64)
    let bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
}
//https://stackoverflow.com/questions/56846930/how-to-convert-raw-representations-of-ecdh-key-pair-into-a-json-web-key
export const hex_to_uintarray = (hex = '') => {
    const a = []
    for (let i = 0, len = hex.length; i < len; i += 2) {
        a.push(parseInt(hex.substr(i, 2), 16))
    }
    return new Uint8Array(a)
}
export const buffer_to_base64 = (buf = '') => {
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}
export const base64_to_base64url = (base64 = '') => {
    return base64.replaceAll('/', '_').replaceAll('+', '-').replaceAll('=', '')
}
export const base64url_to_base64 = (base64url = '') => {
    return base64url.replaceAll('_', '/').replaceAll('-', '+')
}
//https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
export const buffer_to_hex = (buffer = '') => {
    // buffer is an ArrayBuffer
    return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
export const concatBuffer = (...buffer) => {
    const length = buffer.reduce((acc, cur) => acc + cur.byteLength, 0)
    let tmp = new Uint8Array(length)
    buffer.reduce((acc, cur) => {
        tmp.set(new Uint8Array(cur), acc)
        return acc + cur.byteLength
    }, 0)
    return tmp
}
