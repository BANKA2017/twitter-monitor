import axios from "redaxios"

const axiosFetch = (config) => {
    let axiosConfig = {
        timeout: 30000,//TODO check timeout
        headers: {
            //authorization: TW_AUTHORIZATION,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        }
    }

    if (config?.headers) {
        const tmpHeaders = config.headers
        delete config.headers
        axiosConfig = {...config, ...axiosConfig}
        axiosConfig.headers = {...tmpHeaders, ...axiosConfig.headers}
    } else {
        axiosConfig = {...config, ...axiosConfig}
    }
    return axios.create(axiosConfig)
}

export default axiosFetch