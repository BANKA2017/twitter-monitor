import { getImage } from '../../../../src/core/Core.fetch.mjs'
import { existsSync, writeFile } from 'node:fs'
import { PathInfo, VerifyQueryString } from '../../../../src/core/Core.function.mjs'
import { basePath } from '../../../../src/share/Constant.mjs'

const MediaProxy = async (req, res) => {
    //const resSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>'
    const link = req.params[1]
    const format = VerifyQueryString(req.query.format, '')
    const name = VerifyQueryString(req.query.name, '')
    const prefix = VerifyQueryString(req.query.prefix, '/media/proxy/')//for some m3u8

    //for m3u8
    const ext = ['ext_tw_video', 'amplify_video'].includes(req.params[0])

    let mediaLinkArray = PathInfo(link)
    if (format !== '' && name !== '') {
        mediaLinkArray.size = name
        mediaLinkArray.extension = format
        mediaLinkArray.basename += `.${format}`
    }

    //check
    if (!mediaLinkArray.filename || ((!/^(abs|pbs|video)\.twimg\.com\//.test(mediaLinkArray.dirname) && !/^[^\/]+\.pscp\.tv\//.test(mediaLinkArray.dirname)) && !ext)) {
        //res.setHeader('Content-Type', 'image/svg+xml')
        res.status(403).end()
        return
    } else if (mediaLinkArray.basename === 'banner.jpg') {
        getImage(`https://${mediaLinkArray.dirname}`).then(response => {
            res.setHeader('Content-Type', response.headers['content-type'])
            //res.setHeader('Content-Disposition', 'attachment;filename=banner.jpg')
            //response.data.pipe(res)
            res.send(response.data)
        }).catch(e => {
            //res.setHeader('Content-Type', 'image/svg+xml')
            res.status(500).end()
        })
    } else {
        switch (mediaLinkArray.extension) {
            case "jpg":
            case "jpeg":
            case "png":
            case "mp4":
            case "m3u8":
            case "m4s":
            case "ts":
            case "aac":
                if (!['mp4', 'm4s', 'm3u8', 'aac'].includes(mediaLinkArray.extension) && (mediaLinkArray.size === 'small' || mediaLinkArray.extension === 'ts') && existsSync(`${basePath}/../apps/backend/cache/${mediaLinkArray.basename}`)) {
                    //hit
                    res.setHeader('X-TMCache', 1)
                    res.redirect(307, `/media/cache/${mediaLinkArray.basename}`)
                    return
                } else {
                    res.setHeader('X-TMCache', 0)
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
                            realLink = (ext ? `https://video.twimg.com/${req.params[0]}/` : 'https://') + link
                            break
                        default:
                            res.status(403).end()
                            return
                    }
                    try {
                        const tmpBuffer = await getImage(realLink, {referer: 'https://twitter.com/'})
                        const contentLength = (tmpBuffer?.data || new ArrayBuffer(0)).byteLength
                        //res.setHeader('Accept-Ranges', 'bytes')
                        if (contentLength === 0) {
                            //res.setHeader('Content-Type', 'image/svg+xml')
                            res.status(404).end()
                        } else {
                            if ( ((mediaLinkArray.extension !== 'mp4' && mediaLinkArray.size === 'small') || mediaLinkArray.extension === 'ts')) {
                                writeFile(`${basePath}/../apps/backend/cache/${mediaLinkArray.basename}`, tmpBuffer.data, e => {
                                    if (e) {console.error(`MediaProxy: #MediaProxy error`, e)}
                                })
                            }
                            //res.setHeader('content-disposition', `attachment;filename=${mediaLinkArray.basename}`)
                            res.setHeader('Content-Length', contentLength)
                            res.setHeader('Content-Type', tmpBuffer?.headers?.['content-type'])
                            //response.data.pipe(res)
                            if ((mediaLinkArray.pathtype === 3) && ['m3u8', 'm3u'].includes(mediaLinkArray.extension) && prefix) {
                                res.send(tmpBuffer.data.toString().replaceAll(/^\//gm, `${prefix}${mediaLinkArray.firstpath}/`))
                            } else {
                                res.send(tmpBuffer.data)
                            }
                            //res.send(response.data)
                        }
                    } catch(e) {
                        //TODO solve sometimes 500
                        console.error('Media PROXY', realLink, e)
                        res.status(500).end()
                    }
                }
                break
            default:
                //res.setHeader('content-type', 'image/svg+xml')
                res.status(403).end()
        }
    }

    //res.json([req.query, req.params, mediaLinkArray])
}

export {MediaProxy}