const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function testFacebookDownload() {
    rl.question('Enter Facebook URL: ', async (url) => {
        try {
            console.log('🔄 Testing Facebook download...');
            
            const response = await axios.post('http://localhost:3000/api/v1/facebook/download', {
                url: url
            });
            
            if (response.data.success) {
                console.log('\n✅ SUCCESS!');
                console.log('Method:', response.data.method);
                console.log('Title:', response.data.data.title);
                console.log('Download URL:', response.data.data.downloadUrl);
                
                if (response.data.data.downloadUrlHD) {
                    console.log('HD URL:', response.data.data.downloadUrlHD);
                }
                if (response.data.data.downloadUrlSD) {
                    console.log('SD URL:', response.data.data.downloadUrlSD);
                }
            } else {
                console.log('\n❌ FAILED:', response.data.message);
            }
        } catch (error) {
            console.log('\n❌ ERROR:', error.response?.data?.message || error.message);
        }
        
        rl.close();
    });
}

testFacebookDownload();
