import { useEffect, useState } from 'react'
import styles from '../styles/Login.module.scss'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'

const Register = () => {
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const router = useRouter()

    const sendLoginRequest = () => {
        fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({login: login, password: password}),
            credentials: 'include',
            
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                setErrorMessage(data.error)
            }
            else {
                setErrorMessage('')
                Cookies.set('session_token', data.load, { expires: 365 })
                router.push('/messenger')
            }
        })
        .catch(error => console.log(error.message))
    }


    const handleFormSubmit = (e) => {
        e.preventDefault()
        sendLoginRequest()
    }

    useEffect(() => {
        document.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendLoginRequest() })
    }, [])

    return ( 
        <>
            <section className={styles.register}>
                <form className={styles.registerForm}>
                    <div className={styles.registerFormTitle}>Login / Registration</div>
                    {errorMessage && <div className={styles.registerFormError}>{errorMessage}</div>}
                    <div className={styles.registerFormField}>
                        <label>Login</label>
                        <input type="text" placeholder='Your login' onChange={e => {setLogin(e.target.value)}}/>
                    </div>
                    <div className={styles.registerFormField}>
                        <label>Password</label>
                        <input type="password" placeholder='Your password here' onChange={e => {setPassword(e.target.value)}}/>
                    </div>
                    <button className={styles.registerFormButton} onClick={handleFormSubmit}>Let's go</button>
                </form>
            </section>
        </>
    );
}
 
export default Register;