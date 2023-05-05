import { getImage } from '../../../../libs/core/Core.fetch.mjs'
import { PathInfo, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { GetMime } from '../../../../libs/share/Mime.mjs'

const MediaProxy = async (req, env) => {
    //const resSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>'
    const link = req.params.link
    const format = VerifyQueryString(req.query.format, '')
    const name = VerifyQueryString(req.query.name, '')
    const prefix = VerifyQueryString(req.query.prefix, '/media/proxy/')//for some m3u8

    //for m3u8
    const ext = ['ext_tw_video', 'amplify_video'].includes(req.type)

    let mediaLinkArray = PathInfo(link)
    if (format !== '' && name !== '') {
        mediaLinkArray.size = name
        mediaLinkArray.extension = format
        mediaLinkArray.basename += `.${format}`
    }
    let responseHeaders = {}
    //check
    if (!mediaLinkArray.filename || ((!/^(abs|pbs|video)\.twimg\.com\//.test(mediaLinkArray.dirname) && !/^[^\/]+\.pscp\.tv\//.test(mediaLinkArray.dirname)) && !ext)) {
        //res.setHeader('Content-Type', 'image/svg+xml')
        return new Response(null, {status: 403, headers: responseHeaders})
    } else if (mediaLinkArray.basename === 'banner.jpg') {
        try {
            const banner = await getImage(`https://${mediaLinkArray.dirname.slice(0, -1)}`)
            responseHeaders['Content-Type'] = banner.headers.get('content-type')
            //res.setHeader('Content-Disposition', 'attachment;filename=banner.jpg')
            //response.data.pipe(res)
            return new Response(banner.data, {
                status: 200,
                headers: {
                    ...responseHeaders,
                    'content-type': GetMime(responseHeaders['Content-Type'])
                }
            })
        } catch (e) {
            return new Response(null, {status: 500, headers: responseHeaders})
        }
    } else {
        switch (mediaLinkArray.extension.toLocaleLowerCase()) {
            case "jpg":
            case "jpeg":
            case "png":
            case "mp4":
            case "m3u8":
            case "m4s":
            case "ts":
            case "aac":
                responseHeaders['X-TMCache'] = 0
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
                        return new Response(null, {status: 403, headers: responseHeaders})
                }
                try {
                    const tmpBuffer = await getImage(realLink, {referer: 'https://twitter.com/'})
                    const contentLength = (tmpBuffer?.data || new ArrayBuffer(0)).byteLength
                    //res.setHeader('Accept-Ranges', 'bytes')
                    if (contentLength === 0) {
                        //res.setHeader('Content-Type', 'image/svg+xml')
                        return new Response(null, {status: 404, headers: responseHeaders})
                    } else {
                        //res.setHeader('content-disposition', `attachment;filename=${mediaLinkArray.basename}`)
                        responseHeaders['Content-Length'] = contentLength
                        responseHeaders['Content-Type'] = (tmpBuffer?.headers ?? new Map()).get('content-type')
                        //response.data.pipe(res)
                        if ((mediaLinkArray.pathtype === 3) && ['m3u8', 'm3u'].includes(mediaLinkArray.extension) && prefix) {
                            return new Response(new TextDecoder("utf-8").decode(tmpBuffer.data).replaceAll(/^\//gm, `${prefix}${mediaLinkArray.firstpath}/`), {
                                status: 200,
                                headers: {
                                    ...responseHeaders,
                                    'content-type': GetMime(mediaLinkArray.extension)
                                }
                            })
                        } else {
                            return new Response(tmpBuffer.data, {
                                status: 200,
                                headers: {
                                    ...responseHeaders,
                                    'content-type': GetMime(mediaLinkArray.extension)
                                }
                            })
                        }
                        //res.send(response.data)
                    }
                } catch(e) {
                    //TODO solve sometimes 500
                    console.error('Media PROXY', realLink, e)
                    return new Response(null, {status: 500, headers: responseHeaders})
                }
                break
            default:
                //res.setHeader('content-type', 'image/svg+xml')
                return new Response(null, {status: 403, headers: responseHeaders})
        }
    }

    //res.json([req.query, req.params.link, mediaLinkArray])
}

export {MediaProxy}