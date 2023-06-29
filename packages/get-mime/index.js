//jpeg FF D8 FF image/jpeg
//png 89 50 4E 47 0D 0A 1A 0A
//webp 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 image/webp
//gif87a 47 49 46 38 37 61 image/gif
//gif89a 47 49 46 38 39 61 image/gif
//m4v mp4 video/mp4
//mov video/quicktime

export const supportedFileType = {
    jpg: { magic_number: [0xff, 0xd8, 0xff], mime: 'image/jpeg', extension: ['pjp', 'jpg', 'pjpeg', 'jpeg', 'jfif'] },
    png: { magic_number: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: 'image/png', extension: ['png'] },
    webp: { magic_number: [0x52, 0x49, 0x46, 0x46, '??', '??', '??', '??', 0x57, 0x45, 0x42, 0x50], mime: 'image/webp', extension: ['webp'] },
    gif: { magic_number: [0x47, 0x49, 0x46, 0x38, ['7', '9'], 0x61], mime: 'image/gif', extension: ['gif'] },
    //m4v: ['??', '??', '??', '??', 'f', 't', 'y', 'p', 'M', '4', 'V', '??'],
    mov: { magic_number: ['??', '??', '??', '??', 'f', 't', 'y', 'p', 'q', 't', '??', '??'], mime: 'video/quicktime', extension: ['mov'] },
    mov_moov: { magic_number: ['??', '??', '??', '??', 'm', 'o', 'o', 'v'], mime: 'video/quicktime', extension: ['mov'] },
    mp4: { magic_number: ['??', '??', '??', '??', 'f', 't', 'y', 'p', '??', '??', '??', '??'], mime: 'video/mp4', extension: ['mp4'] }
}

//type of buffer is ArrayBuffer
const GetMime = (buffer, findMode = false) => {
    const sliceArray = [...new Uint8Array(buffer.slice(0, 12))]
    if (findMode) {
        return Object.entries(supportedFileType).find((listItem) =>
            listItem[1].magic_number.every((value, index) => {
                if (value === '??') {
                    return true
                } else if (Array.isArray(value)) {
                    return value.map((x) => (typeof x === 'number' ? x : x.charCodeAt())).includes(sliceArray[index])
                } else if (typeof value === 'string') {
                    return value === String.fromCharCode(sliceArray[index])
                } else {
                    return value === sliceArray[index]
                }
            })
        )[1]
    } else {
        return Object.fromEntries(
            Object.entries(supportedFileType).filter((listItem) =>
                listItem[1].magic_number.every((value, index) => {
                    if (value === '??') {
                        return true
                    } else if (Array.isArray(value)) {
                        return value.map((x) => (typeof x === 'number' ? x : x.charCodeAt())).includes(sliceArray[index])
                    } else if (typeof value === 'string') {
                        return value === String.fromCharCode(sliceArray[index])
                    } else {
                        return value === sliceArray[index]
                    }
                })
            )
        )
    }
}

export default GetMime
