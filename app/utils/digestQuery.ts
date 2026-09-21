export const digests = () => queryCollection('digest')

export const digestList = () => digests().order('date', 'DESC').select('path', 'title', 'date')
