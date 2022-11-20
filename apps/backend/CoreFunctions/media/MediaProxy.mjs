import { getImage } from '../../../../src/core/Core.fetch.mjs'
import { existsSync, writeFile } from 'fs'
import { PathInfo, VerifyQueryString } from '../../../../src/core/Core.function.mjs'
import { basePath } from '../../../../src/share/Constant.mjs'

const MediaProxy = async (req, res) => {
    const resSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>'
    const link = req.params[1]
    const format = VerifyQueryString(req.query.format, '')
    const name = VerifyQueryString(req.query.name, '')

    //for m3u8
    const ext = req.params[0] === 'ext_tw_video' || req.params[0] === 'amplify_video'

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
                let hit = 0

                if (mediaLinkArray.extension !== 'mp4') {
                    hit = existsSync(`${basePath}/../apps/backend/cache/${mediaLinkArray.basename}`) ? 1 : 0
                }

                res.setHeader('X-TMCache', hit)
                if (!['mp4', 'm4s', 'ts', 'm3u8', 'aac'].includes(mediaLinkArray.extension) && hit && mediaLinkArray.size === 'small') {
                    res.redirect(307, `/media/cache/${mediaLinkArray.basename}`)
                } else {
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
                            res.setHeader('Content-Type', 'image/svg+xml')
                            res.status(403).end()
                            return
                    }
                    getImage(realLink).then(response => {
                        //res.setHeader('Accept-Ranges', 'bytes')
                        const contentLength = (response?.data || new ArrayBuffer(0)).byteLength
                        if (contentLength === 0) {
                            //res.setHeader('Content-Type', 'image/svg+xml')
                            res.status(404).end()
                        } else {
                            res.setHeader('Content-Length', contentLength)
                            res.setHeader('Content-Type', response?.headers?.['content-type'])
                            //res.setHeader('content-disposition', `attachment;filename=${mediaLinkArray.basename}`)
                            if (mediaLinkArray.extension !== 'mp4' && !hit && mediaLinkArray.size === 'small') {
                                writeFile(`${basePath}/../apps/backend/cache/${mediaLinkArray.basename}`, response.data, e => {
                                    if (e) {console.error(`MediaProxy: #MediaProxy error`, e)}
                                })
                            }
                            //response.data.pipe(res)
                            res.send(response.data)
                        }
                    }).catch(e => {
                        //TODO solve sometimes 500
                        console.error('Media PROXY', realLink, e)
                        //res.setHeader('Content-Type', 'image/svg+xml')
                        res.status(500).end()
                    })
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