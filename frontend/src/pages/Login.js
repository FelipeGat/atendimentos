import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import loginIllustration from '../assets/login-illustration.png';
import logo1 from '../assets/delta.png';
import logo2 from '../assets/gw-logo.jpg';
import logo3 from '../assets/invest.jpg';
import { apiRequest } from '../utils/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        if (!email.trim() || !password.trim()) {
            setError('Preencha todos os campos.');
            setLoading(false);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Email inválido.');
            setLoading(false);
            return;
        }

        try {
            const data = await apiRequest('login.php', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim(),
                    password: password.trim()
                })
            });

            if (data.message === "Login realizado com sucesso") {
                console.log('Login bem-sucedido!', data.data);

                const userData = {
                    id: data.data.usuario.id,
                    nome: data.data.usuario.nome,
                    email: data.data.usuario.email,
                    perfil: data.data.usuario.perfil,
                    foto: data.data.usuario.foto,
                    token: data.data.token
                };

                if (rememberMe) {
                    localStorage.setItem('user', JSON.stringify(userData));
                } else {
                    sessionStorage.setItem('user', JSON.stringify(userData));
                }

                // Tentar navegar para o dashboard
                console.log('Tentando navegar para /dashboard');
                try {
                    navigate('/dashboard');
                } catch (navError) {
                    console.error('Erro ao navegar:', navError);
                    setError('Erro ao redirecionar. Tente recarregar a página.');
                }

            } else {
                setError(data.mensagem || 'Erro ao fazer login.');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (error) setError('');
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (error) setError('');
    };

    return (
        <div className='app-container'>
            <div className="login-page">
                <div className="login-half-background">
                    <div className="login-form-container">
                        <div className="login-header">
                            <h1>Bem Vindo</h1>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}
                            <div className="input-group">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                            <div className="remember-forgot">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        disabled={loading}
                                    />
                                    Relembre-me
                                </label>
                                <a href="/recuperar-senha">
                                    Esqueceu a Senha?
                                </a>
                            </div>
                            <button
                                type="submit"
                                className="submit-button"
                                disabled={loading}
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="login-half-illustration">
                    <div className="login-header-illustration">
                        <h1>Grupos Soluções</h1>
                    </div>

                    <div className="illustration">
                        <img
                            src={loginIllustration}
                            alt="Pessoas trabalhando com o sistema"
                        />
                    </div>

                    <div className="logos-container">
                        <img src={logo1} alt="Delta Soluções" className="logo" />
                        <img src={logo2} alt="GW Soluções" className="logo" />
                        <img src={logo3} alt="Investimentos" className="logo" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;