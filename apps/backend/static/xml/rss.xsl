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
                    .main{
                            margin: 2rem 1rem;
                        }
                    @media screen and (min-width:640.01px){
                        .main{
                            margin: 2rem 5rem;
                        }
                    }
                    @media screen and (min-width:768.01px){
                        .main{
                            margin: 2rem 10rem;
                        }
                    }
                    @media screen and (min-width:1024.01px){
                        .main{
                            margin: 2rem 16rem;
                        }
                    }
                </style>
            </head>
            <body class="main">
                <header>
                    <h1>Twitter Monitor RSS</h1>
                    <a hreflang="en" target="_blank">
                        <xsl:attribute name="href">
                            <xsl:value-of select="/rss/channel/link"/>
                        </xsl:attribute>
                        <h2>
                        <xsl:value-of select="/rss/channel/title"/>
                        &#x2192;
                    </h2>
                    </a>
                    <p>
                        <xsl:value-of select="/rss/channel/description"/>
                    </p>
                    
                </header>
                <main>
                    <hr />
                    <a hreflang="en">
                        <xsl:attribute name="href">
                            <xsl:value-of select="/rss/channel/topCursor"/>
                        </xsl:attribute>
                        <h3>&#x2191; Newer &#x2191;</h3>
                    </a>
                    <xsl:for-each select="/rss/channel/item">
                    <hr />
                        <article>
                            <h3><xsl:value-of select="author"/></h3>
                            <p><xsl:value-of select="title"/></p>
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
                    <hr />
                    <a hreflang="en">
                        <xsl:attribute name="href">
                            <xsl:value-of select="/rss/channel/bottomCursor"/>
                        </xsl:attribute>
                        <h3>&#x2193; More &#x2193;</h3>
                    </a>
                </main>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>