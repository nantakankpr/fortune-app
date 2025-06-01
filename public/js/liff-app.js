document.addEventListener('DOMContentLoaded', async () => {
    const liff_id = "2007423411-wVYbLZ63";
    try {
        await liff.init({ liffId: liff_id });
        console.log("LIFF Init Success");
    } catch (initError) {
        console.error("LIFF Init Error:", initError);
        return;
    }

    liff.ready.then(async () => {
        try {
            // ตรวจ session กับ backend
            const res = await fetch('/auth/session', {
                credentials: 'include',
            });

            const data = await res.json();

            if (data.loggedIn) {
                // เช็คว่ามี subscription หรือไม่
                if (!data.hasSubscription) {
                    // ยังไม่มี subscription ให้ไปหน้า payment
                    window.location.href = '/order/payment';
                    return;
                }
                
                // มี subscription แล้วให้ปิด LIFF
                if (liff.isInClient()) {
                    window.location.href = '/order/succeeded';
                }
                return;
            }

            // ยังไม่ login session → ตรวจ LIFF login
            if (!liff.isLoggedIn()) {
                liff.login(); // จะ redirect ไป LINE login
                return;
            }

            // ได้ login กับ LINE แล้ว → ดึง token
            const idToken = liff.getIDToken();
            if (!idToken) {
                console.warn('ID Token is null → logout + reload');
                liff.logout();
                location.reload();
                return;
            }

            // ส่ง token ไป login backend
            const loginRes = await fetch('/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${idToken}`,
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({ name: 'Justin' })
            });

            const loginJson = await loginRes.json();

            if (loginJson.success) {
                if (loginJson.redirect) {
                    window.location.href = loginJson.redirect;
                } else {
                    if (liff.isInClient()) {
                        window.location.href = '/order/succeeded';
                    }
                }
            } else {
                liff.logout();
                location.reload();
            }

        } catch (err) {
            console.error('Session check failed or login error:', err);
        }
    });

});
