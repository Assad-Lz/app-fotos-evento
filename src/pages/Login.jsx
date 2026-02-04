import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

// IMPORTAÇÃO DOS ATIVOS PARA O BACKGROUND
// (Verifique se o caminho da pasta é '../img/' ou '../imgs/' conforme seu projeto atual)
import bonecoMM from '../imgs/boneco_vermelho_mm.png';
import logoSnickers from '../imgs/LogoSnickers.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) {
            alert("Senha errada, amigão! Tenta de novo. 🍫");
        } else {
            navigate('/admin');
        }
        setLoading(false);
    }

    // Função para gerar o padrão de fundo
    const renderBackgroundPattern = () => {
        return Array.from({ length: 30 }).map((_, i) => {
            const imgSource = i % 2 === 0 ? bonecoMM : logoSnickers;
            // Aumentei um pouco o tamanho base dos elementos também
            const sizeClass = i % 2 === 0 ? 'h-28 md:h-36' : 'h-14 md:h-20';
            const rotation = i % 3 === 0 ? 'rotate-12' : i % 3 === 1 ? '-rotate-12' : 'rotate-45';

            return (
                <div key={i} className="flex items-center justify-center p-4">
                    <img
                        src={imgSource}
                        // Adicionei drop-shadow-xl para destacar mais do fundo azul
                        className={`w-auto object-contain drop-shadow-xl transition-transform ${sizeClass} ${rotation}`}
                        alt="background pattern"
                    />
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-[#0034a1] flex items-center justify-center p-4 relative overflow-hidden font-sans">

            {/* BACKGROUND PATTERN MULTIPLICADO - MAIS VISÍVEL */}
            {/* MUDANÇA AQUI: De opacity-10 para opacity-30 */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none select-none overflow-hidden">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-6 w-[120%] h-[120%] -ml-[10%] -mt-[10%] animate-pulse-slow">
                    {renderBackgroundPattern()}
                </div>
            </div>

            {/* Card de Login */}
            <form onSubmit={handleLogin} className="bg-white p-10 rounded-[3rem] shadow-[0_20px_0_0_#4e3629] w-full max-w-sm border-8 border-[#4e3629] z-20 relative">
                <div className="flex justify-center mb-8">
                    <div className="bg-[#ffcc00] p-5 rounded-full shadow-[0_6px_0_0_#c49a00] border-4 border-white animate-bounce-slow">
                        <Lock size={40} className="text-[#4e3629]" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-[900] text-[#4e3629] mb-8 uppercase italic tracking-tighter leading-none">
                    Portal <span className="text-[#0034a1] block text-4xl mt-1">Staff</span>
                </h2>

                <div className="space-y-4">
                    <input
                        type="email" placeholder="Seu e-mail"
                        className="w-full p-5 bg-gray-100 border-4 border-transparent focus:border-[#ffcc00] rounded-2xl outline-none font-bold text-[#4e3629] transition-all placeholder:text-gray-400"
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        type="password" placeholder="Sua senha"
                        className="w-full p-5 bg-gray-100 border-4 border-transparent focus:border-[#ffcc00] rounded-2xl outline-none font-bold text-[#4e3629] transition-all placeholder:text-gray-400"
                        onChange={e => setSenha(e.target.value)}
                    />
                </div>

                <button
                    disabled={loading}
                    className={`w-full p-5 rounded-3xl font-black text-xl mt-8 shadow-[0_8px_0_0_#001a51] active:shadow-none active:translate-y-2 transition-all text-white uppercase italic ${loading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-[#0034a1] hover:bg-[#002a81]'
                        }`}
                >
                    {loading ? 'Verificando...' : 'Bora pro Stand! 🍫'}
                </button>
            </form>

            <style>{`
                /* Ajustei a animação para pulsar apenas o tamanho, mantendo a opacidade fixa */
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 12s infinite ease-in-out;
                }
                .animate-bounce-slow {
                    animation: bounce 3s infinite;
                }
            `}</style>
        </div>
    );
}