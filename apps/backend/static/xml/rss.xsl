<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title><xsl:value-of select="/rss/channel/title"/></title>
                <meta charset="UTF-8" />
                <meta http-equiv="x-ua-compatible" content="IE=edge,chrome=1" />
                <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1,shrink-to-fit=no" />
                <style type="text/css">
                    /* Your custom styles can go here! */
                </style>
            </head>
            <body>
                <header>
                    <h1>RSS Feed</h1>
                    <h2>
                        <xsl:value-of select="/rss/channel/title"/>
                    </h2>
                    <p>
                        <xsl:value-of select="/rss/channel/description"/>
                    </p>
                    <a hreflang="en" target="_blank">
                        <xsl:attribute name="href">
                            <xsl:value-of select="/rss/channel/link"/>
                        </xsl:attribute>
                        Visit Website &#x2192;
                    </a>
                </header>
                <main>
                    <h2>Recent Posts</h2>
                    <xsl:for-each select="/rss/channel/item">
                    <hr />
                        <article>
                            <h3>
                                <xsl:value-of select="title"/>
                            </h3>
                            <footer>
                                Published:
                                <time>
                                    <xsl:value-of select="pubDate" />
                                </time><br />
                                <a hreflang="en" target="_blank">
                                    <xsl:attribute name="href">
                                        <xsl:value-of select="link"/>
                                    </xsl:attribute>
                                    View tweet &#x2192;
                                </a>
                            </footer>
                        </article>
                    </xsl:for-each>
                </main>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>