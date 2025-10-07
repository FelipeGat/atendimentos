/**
 * Função utilitária para formatar datas de forma segura
 * Lida com diferentes formatos de data, incluindo o formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
 * 
 * @param {string|Date|null|undefined} dateString - String de data ou objeto Date
 * @param {string} locale - Localização para formatação (padrão: 'pt-BR')
 * @param {object} options - Opções para formatação (padrão: { dateStyle: 'short' })
 * @returns {string} - Data formatada ou string vazia se inválida
 */
export const formatDate = (dateString, locale = 'pt-BR', options = { dateStyle: 'short' }) => {
    if (!dateString) return '-';
    
    let date;
    
    // Se já for um objeto Date, usar diretamente
    if (dateString instanceof Date) {
        date = dateString;
    } 
    // Se for string e conter espaço (formato MySQL DATETIME: YYYY-MM-DD HH:MM:SS)
    else if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Converter o formato MySQL (YYYY-MM-DD HH:MM:SS) para o formato ISO (YYYY-MM-DDTHH:MM:SS)
        const isoDateString = dateString.replace(' ', 'T');
        date = new Date(isoDateString);
    } 
    // Caso contrário, tentar criar Date com o valor original
    else {
        date = new Date(dateString);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
        console.warn(`Data inválida: ${dateString}`);
        return 'Data inválida';
    }
    
    return date.toLocaleDateString(locale, options);
};

/**
 * Função utilitária para formatar datas e horas de forma segura
 * Lida com diferentes formatos de data, incluindo o formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
 * 
 * @param {string|Date|null|undefined} dateString - String de data ou objeto Date
 * @param {string} locale - Localização para formatação (padrão: 'pt-BR')
 * @param {object} options - Opções para formatação (padrão: { dateStyle: 'short', timeStyle: 'short' })
 * @returns {string} - Data e hora formatadas ou string vazia se inválida
 */
export const formatDateTime = (dateString, locale = 'pt-BR', options = { dateStyle: 'short', timeStyle: 'short' }) => {
    if (!dateString) return '-';
    
    let date;
    
    // Se já for um objeto Date, usar diretamente
    if (dateString instanceof Date) {
        date = dateString;
    } 
    // Se for string e conter espaço (formato MySQL DATETIME: YYYY-MM-DD HH:MM:SS)
    else if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Converter o formato MySQL (YYYY-MM-DD HH:MM:SS) para o formato ISO (YYYY-MM-DDTHH:MM:SS)
        const isoDateString = dateString.replace(' ', 'T');
        date = new Date(isoDateString);
    } 
    // Caso contrário, tentar criar Date com o valor original
    else {
        date = new Date(dateString);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
        console.warn(`Data inválida: ${dateString}`);
        return 'Data inválida';
    }
    
    return date.toLocaleString(locale, options);
};