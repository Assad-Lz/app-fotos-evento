import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { r2, r2PublicUrl } from '../r2Client';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { useNavigate } from 'react-router-dom';
import { LogOut, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import bonecoMM from '../imgs/boneco_vermelho_mm.png';
import pacoteMM from '../imgs/PacotedeMM.png';
import logoSnickers from '../imgs/LogoSnickers.png';
import barraSnickers from '../imgs/barrasnickers.png';

export default function Admin() {
    const [loading, setLoading] = useState(false);
    const [numero, setNumero] = useState('');
    const [dia, setDia] = useState('07');
    const [file, setFile] = useState(null);
    const [mensagem, setMensagem] = useState({ type: '', text: '' });
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) navigate('/login');
        };
        checkUser();
    }, [navigate]);

    async function handleUpload(e) {
        e.preventDefault();
        if (!file || !numero) {
            setMensagem({ type: 'error', text: "Preencha tudo! 🍫" });
            return;
        }
        setLoading(true);
        setMensagem({ type: '', text: '' });

        try {
            const formatado = numero.toString().padStart(4, '0');
            const fileName = `BBD_${formatado}.jpg`;
            const fullPath = `${dia}/${fileName}`;
            const arrayBuffer = await file.arrayBuffer();
            const fileBuffer = new Uint8Array(arrayBuffer);

            await r2.send(new PutObjectCommand({
                Bucket: "fotos-evento", Key: fullPath, Body: fileBuffer,
                ContentType: "image/jpeg", ContentLength: fileBuffer.length,
            }));

            await supabase.from('fotos').insert([{
                numero_foto: parseInt(numero), dia_evento: dia,
                url_imagem: `${r2PublicUrl}/${fullPath}`
            }]);

            setMensagem({ type: 'success', text: "Show! Foto enviada com sucesso!" });
            setNumero(''); setFile(null);
            e.target.reset();
        } catch (err) {
            setMensagem({ type: 'error', text: "Erro ao enviar." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#ffcc00] flex items-center justify-center p-6 relative overflow-hidden font-sans">

            {/* FAIXA DIAGONAL PARA MAIOR VISIBILIDADE */}
            <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none select-none">
                <div className="w-[300%] flex gap-24 animate-marquee whitespace-nowrap py-12 items-center -rotate-[15deg]">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex gap-24 items-center">
                            <img src={bonecoMM} className="h-24 w-auto drop-shadow-xl rotate-12" alt="boneco" />
                            <img src={logoSnickers} className="h-14 w-auto drop-shadow-lg" alt="logo" />
                            <img src={pacoteMM} className="h-28 w-auto drop-shadow-xl -rotate-6" alt="pacote" />
                            <img src={barraSnickers} className="h-12 w-auto drop-shadow-lg rotate-12" alt="barra" />
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
                className="absolute top-6 right-6 flex items-center gap-2 text-[#4e3629] hover:text-[#df0024] font-black z-30 transition-all active:scale-90">
                <LogOut size={20} /> SAIR
            </button>

            <div className="bg-white p-8 rounded-[3rem] shadow-[0_12px_0_0_#4e3629] w-full max-w-md border-4 border-[#4e3629] z-20 relative">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-[#df0024] p-4 rounded-full mb-3 shadow-[0_5px_0_0_#a0001a] border-4 border-white">
                        <img src={bonecoMM} className="w-10 h-10 object-contain" alt="M&M Logo" />
                    </div>
                    <h1 className="text-2xl font-[900] text-[#4e3629] tracking-tight uppercase italic">Painel Admin</h1>
                </div>

                <form onSubmit={handleUpload} className="flex flex-col gap-5">
                    <div className="flex bg-[#4e3629] p-2 rounded-full border-2 border-[#4e3629]">
                        {['07', '08'].map(d => (
                            <button key={d} type="button" onClick={() => setDia(d)} className={`flex-1 py-3 rounded-full font-black text-xs transition-all ${dia === d ? 'bg-[#0072bc] text-white shadow-md' : 'text-gray-300'}`}>DIA {d}</button>
                        ))}
                    </div>
                    <input type="number" placeholder="Número da foto" value={numero} onChange={e => setNumero(e.target.value)} className="w-full p-4 bg-gray-100 border-4 border-transparent focus:border-[#ffcc00] rounded-2xl outline-none font-bold text-[#4e3629]" />
                    <div className="p-6 border-4 border-dashed border-gray-200 rounded-[2rem] hover:border-[#ffcc00] transition-all flex flex-col items-center gap-2 cursor-pointer relative bg-gray-50/50">
                        <input type="file" accept="image/jpeg" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setFile(e.target.files[0])} />
                        <UploadCloud className="text-gray-300" size={32} />
                        <p className="text-sm font-black text-gray-400 text-center">{file ? file.name : "Toque para escolher a foto"}</p>
                    </div>
                    <button disabled={loading} className={`mt-4 p-5 rounded-[2rem] font-[900] text-xl text-white shadow-[0_8px_0_0_#a0001a] active:scale-95 ${loading ? 'bg-gray-400' : 'bg-[#df0024]'}`}>
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "POSTAR AGORA 🚀"}
                    </button>
                </form>

                {mensagem.text && (
                    <div className={`mt-8 p-5 rounded-2xl flex items-center gap-3 font-bold border-4 ${mensagem.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {mensagem.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <span className="text-sm uppercase">{mensagem.text}</span>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-marquee { animation: marquee 30s linear infinite; }
            `}</style>
        </div>
    );
}