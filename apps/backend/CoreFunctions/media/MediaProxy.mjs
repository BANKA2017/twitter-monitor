import { getImage } from '../../../../libs/core/Core.fetch.mjs'
import { PathInfo, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { GetMime } from '../../../../libs/share/Mime.mjs'

const MediaProxy = async (req, env) => {
    //const resSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>'
    const link = req.params.link
    const format = VerifyQueryString(req.query.format, '')
    const name = VerifyQueryString(req.query.name, '')
    const prefix = VerifyQueryString(req.query.prefix, '/media/proxy/') //for some m3u8

    //for m3u8
    const ext = ['ext_tw_video', 'amplify_video'].includes(req.type)

    let mediaLinkArray = {}
    try {
        mediaLinkArray = PathInfo(link)
    } catch (e) {
        console.error(`#MediaProxy ${e}`)
        return env.ResponseWrapper(null, 403, {})
    }
    if (format !== '' && name !== '') {
        mediaLinkArray.size = name
        mediaLinkArray.extension = format
        mediaLinkArray.basename += `.${format}`
    }
    let responseHeaders = new Headers()
    //check
    if (!mediaLinkArray.filename || (!/^(abs|pbs|video)\.twimg\.com\//.test(mediaLinkArray.dirname) && !/^[^\/]+\.pscp\.tv\//.test(mediaLinkArray.dirname) && !ext)) {
        //res.setHeader('Content-Type', 'image/svg+xml')
        return env.ResponseWrapper(null, 403, responseHeaders)
    } else if (mediaLinkArray.basename === 'banner.jpg') {
        try {
            const banner = await getImage(`https://${mediaLinkArray.dirname.slice(0, -1)}`)
            responseHeaders.set('Content-Type', banner.headers.get('content-type'))
            //res.setHeader('Content-Disposition', 'attachment;filename=banner.jpg')
            //response.data.pipe(res)
            return env.ResponseWrapper(banner.data, 200, responseHeaders)
        } catch (e) {
            return env.ResponseWrapper(null, 500, responseHeaders)
        }
    } else {
        switch (mediaLinkArray.extension.toLocaleLowerCase()) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'mp4':
            case 'm3u8':
            case 'm4s':
            case 'ts':
            case 'aac':
            case 'gif':
                if (!['mp4', 'm4s', 'm3u8', 'aac'].includes(mediaLinkArray.extension) && (mediaLinkArray.size === 'small' || mediaLinkArray.extension === 'ts') && env.mediaExistPreCheck(mediaLinkArray.basename)) {
                    responseHeaders.set('X-TMCache', 1)
                    return env.ResponseWrapper(`/media/cache/${mediaLinkArray.basename}`, 307, responseHeaders)
                } else {
                    responseHeaders.set('X-TMCache', 0)
                    let realLink = ''
                    switch (mediaLinkArray.pathtype) {
                        case 3:
                        case 2:
                            realLink = `https://${link}`
                            break
                        case 1:
                            realLink = `https://${link}?format=${mediaLinkArray.extension}&name=${mediaLinkArray.size}`
                            break
                        case 0:
                            realLink = (ext ? `https://video.twimg.com/${req.params.link}/` : 'https://') + link
                            break
                        default:
                            return env.ResponseWrapper(null, 403, responseHeaders)
                    }
                    try {
                        const tmpBuffer = await getImage(realLink, { referer: 'https://twitter.com/' })
                        const contentLength = (tmpBuffer?.data || new ArrayBuffer(0)).byteLength
                        //res.setHeader('Accept-Ranges', 'bytes')
                        if (contentLength === 0) {
                            //res.setHeader('Content-Type', 'image/svg+xml')
                            return env.ResponseWrapper(null, 404, responseHeaders)
                        } else {
                            if ((mediaLinkArray.extension !== 'mp4' && mediaLinkArray.size === 'small') || mediaLinkArray.extension === 'ts') {
                                env.mediaCacheSave(tmpBuffer.data, mediaLinkArray.basename)
                            }
                            //res.setHeader('content-disposition', `attachment;filename=${mediaLinkArray.basename}`)
                            responseHeaders.set('Content-Length', contentLength)
                            responseHeaders.set('Content-Type', tmpBuffer?.headers?.['content-type'] || (tmpBuffer?.headers ?? new Map()).get('content-type'))
                            //response.data.pipe(res)
                            if (mediaLinkArray.pathtype === 3 && ['m3u8', 'm3u'].includes(mediaLinkArray.extension) && prefix) {
                                return env.ResponseWrapper(new TextDecoder('utf-8').decode(tmpBuffer.data).replaceAll(/^\//gm, `${prefix}${mediaLinkArray.firstpath}/`), 200, responseHeaders)
                            } else {
                                return env.ResponseWrapper(tmpBuffer.data, 200, responseHeaders)
                            }
                            //res.send(response.data)
                        }
                    } catch (e) {
                        //TODO solve sometimes 500
                        console.error('Media PROXY', realLink, e)
                        return env.ResponseWrapper(null, 500, responseHeaders)
                    }
                }
                break
            default:
                //res.setHeader('content-type', 'image/svg+xml')
                return env.ResponseWrapper(null, 403, responseHeaders)
        }
    }
}

export { MediaProxy }
