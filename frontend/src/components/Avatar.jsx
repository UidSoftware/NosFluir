const Avatar = ({ nome, fotoUrl, tamanho = 40 }) => {
    const iniciais = nome
        ?.split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'U'

    if (fotoUrl) {
        return (
            <img
                src={fotoUrl}
                alt={nome}
                style={{ width: tamanho, height: tamanho }}
                className="rounded-full object-cover shrink-0"
            />
        )
    }

    return (
        <div
            style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.35 }}
            className="rounded-full bg-gradient-fluir flex items-center justify-center text-white font-semibold shrink-0"
        >
            {iniciais}
        </div>
    )
}

export default Avatar
