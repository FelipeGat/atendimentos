/**
 * Utilitário para chamadas de API
 * Sistema de Gerenciamento de Atendimentos
 */

const API_BASE_URL = 'http://localhost/Atendimentos/backend/api';
const EMPRESA_ID = '1'; // Configurar conforme necessário

/**
 * Configuração padrão para requisições
 */
const getDefaultHeaders = (isFormData = false) => {
    const headers = {
        'X-Empresa-ID': EMPRESA_ID
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

/**
 * Função genérica para fazer requisições à API
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}/${endpoint}`;

    // Identificar se a requisição é FormData para ajustar headers
    const isFormData = options.body instanceof FormData;

    const config = {
        headers: getDefaultHeaders(isFormData),
        ...options
    };

    // Ajustar a forma de envio para PUT/DELETE se for FormData
    if (isFormData && (options.method === 'PUT' || options.method === 'DELETE')) {
        config.method = 'POST'; // Usar POST para que o $_POST funcione
        config.headers['X-HTTP-Method-Override'] = options.method;
    }

    // Remover o cabeçalho Content-Type para FormData
    if (isFormData && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(url, config);

        // A requisição de atualização pode não retornar JSON
        if (response.headers.get('content-type')?.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Erro HTTP: ${response.status}`);
            }
            return data;
        }

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return { success: true, message: `Requisição ${options.method} bem-sucedida.` };

    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
};

/**
 * Métodos específicos para cada tipo de requisição
 */
export const api = {
    // GET - Listar ou buscar por ID
    get: (endpoint, id = null) => {
        const url = id ? `${endpoint}?id=${id}` : endpoint;
        return apiRequest(url, { method: 'GET' });
    },

    // POST - Criar
    post: (endpoint, data) => {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return apiRequest(endpoint, {
            method: 'POST',
            body: body
        });
    },

    // PUT - Atualizar
    put: (endpoint, id, data) => {
        const url = `${endpoint}?id=${id}`;
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return apiRequest(url, {
            method: 'PUT',
            body: body
        });
    },

    // DELETE - Excluir
    delete: (endpoint, id) => {
        const url = `${endpoint}?id=${id}`;
        return apiRequest(url, {
            method: 'DELETE'
        });
    }
};

/**
 * Funções específicas para cada entidade
 */
export const assuntosAPI = {
    listar: () => api.get('assuntos.php'),
    buscar: (id) => api.get('assuntos.php', id),
    criar: (data) => api.post('assuntos.php', data),
    atualizar: (id, data) => api.put('assuntos.php', id, data),
    excluir: (id) => api.delete('assuntos.php', id)
};

export const clientesAPI = {
    listar: () => api.get('clientes.php'),
    buscar: (id) => api.get('clientes.php', id),
    criar: (data) => api.post('clientes.php', data),
    atualizar: (id, data) => api.put('clientes.php', id, data),
    excluir: (id) => api.delete('clientes.php', id)
};

export const segmentosAPI = {
    listar: () => api.get('segmentos.php'),
    buscar: (id) => api.get('segmentos.php', id),
    criar: (data) => api.post('segmentos.php', data),
    atualizar: (id, data) => api.put('segmentos.php', id, data),
    excluir: (id) => api.delete('segmentos.php', id)
};

export const usuariosAPI = {
    listar: () => api.get('usuarios.php'),
    buscar: (id) => api.get('usuarios.php', id),
    criar: (data) => api.post('usuarios.php', data),
    atualizar: (id, data) => api.put('usuarios.php', id, data),
    excluir: (id) => api.delete('usuarios.php', id)
};

export const equipamentosAPI = {
    listar: () => api.get('equipamentos.php'),
    buscar: (id) => api.get('equipamentos.php', id),
    criar: (data) => api.post('equipamentos.php', data),
    atualizar: (id, data) => api.put('equipamentos.php', id, data),
    excluir: (id) => api.delete('equipamentos.php', id)
};

export const atendimentosAPI = {
    listar: () => api.get('atendimentos.php'),
    buscar: (id) => api.get('atendimentos.php', id),
    criar: (data) => api.post('atendimentos.php', data),
    atualizar: (id, data) => api.put('atendimentos.php', id, data),
    excluir: (id) => api.delete('atendimentos.php', id)
};

export const dashboardAPI = {
    obterDados: () => api.get('dashboard.php')
};

export const empresasAPI = {
    listar: () => api.get('empresas.php'),
    buscar: (id) => api.get('empresas.php', id),
    criar: (data) => api.post('empresas.php', data),
    atualizar: (id, data) => api.put('empresas.php', id, data),
    excluir: (id) => api.delete('empresas.php', id)
};