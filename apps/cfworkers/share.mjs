const json = (data) => new Response(JSON.stringify(data), {
    status: 200,
    headers: {
        'content-type': 'application/json'
    }
})

export {json}