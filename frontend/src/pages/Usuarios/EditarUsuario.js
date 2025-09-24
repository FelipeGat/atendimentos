import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EditarUsuarios.css';
import { FaUserCircle } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EditarUsuario = () => {
    // useParams pega o 'id' da URL, ex: /usuarios/editar/5
    const { id } = useParams();
    const navigate = useNavigate();

    // Estado para os dados do formulário e para a foto
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        perfil: '',
        bloqueado: false,
        senha: '',
        confirmarSenha: ''
    });

    const [foto, setFoto] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    // Efeito para buscar os dados do usuário ao carregar o componente
    useEffect(() => {
        const fetchUserData = async () => {
            if (!id) {
                toast.error("ID do usuário não encontrado.");
                return;
            }

            try {
                setLoading(true);
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/usuarios.php?id=${id}`);
                const userData = response.data.data;

                setFormData({
                    nome: userData.nome,
                    email: userData.email,
                    telefone: userData.telefone || '',
                    cpf: userData.cpf || '',
                    perfil: userData.perfil,
                    bloqueado: userData.bloqueado === 1,
                    // Não preenche a senha, por segurança
                    senha: '',
                    confirmarSenha: ''
                });

                // Define a pré-visualização da foto, se existir
                if (userData.foto) {
                    setFotoPreview(`${process.env.REACT_APP_API_BASE_URL}/${userData.foto}`);
                } else {
                    setFotoPreview(null);
                }

            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                toast.error("Erro ao carregar dados do usuário.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    // Manipulador para alterações nos campos de texto
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Manipulador para a foto
    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        setFoto(file);
        // Cria a pré-visualização
        setFotoPreview(URL.createObjectURL(file));
    };

    // Manipulador para o envio do formulário
    const handleSubmit = async (e) => {
        e.preventDefault();

        const { senha, confirmarSenha } = formData;
        if (senha && senha !== confirmarSenha) {
            toast.error("As senhas não coincidem.");
            return;
        }

        const dataToUpdate = new FormData();
        dataToUpdate.append('id', id);
        dataToUpdate.append('nome', formData.nome);
        dataToUpdate.append('email', formData.email);
        dataToUpdate.append('telefone', formData.telefone);
        dataToUpdate.append('cpf', formData.cpf);
        dataToUpdate.append('perfil', formData.perfil);
        dataToUpdate.append('bloqueado', formData.bloqueado ? 1 : 0);
        if (senha) {
            dataToUpdate.append('senha', senha);
        }
        if (foto) {
            dataToUpdate.append('foto', foto);
        }

        try {
            setLoading(true);
            const response = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/usuarios.php?id=${id}`,
                dataToUpdate,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-HTTP-Method-Override': 'PUT' // Necessário para simular o método PUT com FormData
                    }
                }
            );

            if (response.status === 200) {
                toast.success("Usuário atualizado com sucesso!");
                // Opcional: Redirecionar após a edição
                // navigate('/usuarios');
            }
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error.response ? error.response.data : error.message);
            const errorMessage = error.response?.data?.message || "Erro ao atualizar usuário.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="usuarios-container">
            <ToastContainer />
            <div className="usuarios-header">
                <h2>Editar Perfil</h2>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <form className="usuario-form" onSubmit={handleSubmit}>
                    <div className="form-column">
                        <div className="form-group foto-upload-area">
                            <label htmlFor="foto" className="foto-label">
                                {fotoPreview ? (
                                    <img src={fotoPreview} alt="Pré-visualização da foto" className="foto-preview" />
                                ) : (
                                    <FaUserCircle size={100} color="#ccc" />
                                )}
                            </label>
                            <input
                                type="file"
                                id="foto"
                                name="foto"
                                accept="image/*"
                                onChange={handleFotoChange}
                                style={{ display: 'none' }}
                            />
                            <span>Clique para alterar a foto</span>
                        </div>
                    </div>

                    <div className="form-column">
                        <div className="form-group">
                            <label htmlFor="nome">Nome:</label>
                            <input
                                type="text"
                                id="nome"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="telefone">Telefone:</label>
                            <input
                                type="text"
                                id="telefone"
                                name="telefone"
                                value={formData.telefone}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cpf">CPF:</label>
                            <input
                                type="text"
                                id="cpf"
                                name="cpf"
                                value={formData.cpf}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="perfil">Perfil:</label>
                            <select
                                id="perfil"
                                name="perfil"
                                value={formData.perfil}
                                onChange={handleChange}
                                required
                            >
                                <option value="Admin">Admin</option>
                                <option value="Tecnico">Técnico</option>
                                <option value="Usuario">Usuário</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="senha">Nova Senha:</label>
                            <input
                                type="password"
                                id="senha"
                                name="senha"
                                value={formData.senha}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmarSenha">Confirmar Senha:</label>
                            <input
                                type="password"
                                id="confirmarSenha"
                                name="confirmarSenha"
                                value={formData.confirmarSenha}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group checkbox-group">
                            <label htmlFor="bloqueado">Bloqueado:</label>
                            <input
                                type="checkbox"
                                id="bloqueado"
                                name="bloqueado"
                                checked={formData.bloqueado}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => navigate('/usuarios')}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EditarUsuario;