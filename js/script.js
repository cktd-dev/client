document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navMenu = document.querySelector('nav ul');
    
    mobileMenuBtn.addEventListener('click', function() {
        navMenu.classList.toggle('show');
    });
    
    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                navMenu.classList.remove('show');
            }
        });
    });
    
    // Sticky Header on Scroll
    const header = document.querySelector('.glass-header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Modal Handling
    const modal = document.getElementById('bookingModal');
    const bookNowBtn = document.getElementById('bookNowBtn');
    const closeBtn = document.querySelector('.close-btn');
    
    bookNowBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            item.classList.toggle('active');
            
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });
    
    // Form Submission with Razorpay Integration
    const bookingForm = document.getElementById('bookingForm');
    
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            aadhaar: document.getElementById('aadhaar').value,
            service: document.getElementById('service').value
        };
        
        // Validate form
        if (!formData.name || !formData.email || !formData.phone || !formData.aadhaar || !formData.service) {
            alert('Please fill all the required fields.');
            return;
        }
        
        // Create payment order on the server
        createRazorpayOrder(formData);
    });
    
    // Function to create Razorpay order
    async function createRazorpayOrder(formData) {
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: 50, // Amount in INR
                    currency: 'INR',
                    receipt: 'receipt_' + Math.random().toString(36).substr(2, 9)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create order');
            }

            const order = await response.json();

            const options = {
                key: 'rzp_live_1TQJ6BOM51y3yh', // Replace with your Razorpay Key ID
                amount: order.amount,
                currency: order.currency,
                name: 'AadhaarLink',
                description: 'Aadhaar Linking Service Fee',
                image: 'images/logo.png',
                order_id: order.id,
                handler: function(response) {
                    verifyPayment(response, formData);
                },
                prefill: {
                    name: formData.name,
                    email: formData.email,
                    contact: formData.phone
                },
                notes: {
                    aadhaar: formData.aadhaar,
                    service: formData.service
                },
                theme: {
                    color: '#3498db'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    }
    
    async function verifyPayment(paymentResponse, formData) {
        try {
            const response = await fetch('http://localhost:3000/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order_id: paymentResponse.razorpay_order_id,
                    payment_id: paymentResponse.razorpay_payment_id,
                    signature: paymentResponse.razorpay_signature
                })
            });

            if (!response.ok) {
                throw new Error('Payment verification failed');
            }

            const result = await response.json();

            if (result.success) {
                submitToGoogleForms(formData, paymentResponse.razorpay_payment_id);
            } else {
                alert('Payment verification failed. Please contact support.');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Payment verification failed. Please contact support.');
        }
    }

    // Function to submit data to Google Forms
    async function submitToGoogleForms(formData, paymentId) {
        const googleFormsUrl = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse'; // Replace with your Google Form URL
        const formFields = {
            'entry.123456789': formData.name,       // Replace with your field IDs
            'entry.987654321': formData.email,
            'entry.111111111': formData.phone,
            'entry.222222222': formData.aadhaar,
            'entry.333333333': formData.service,
            'entry.444444444': paymentId
        };

        try {
            await fetch(googleFormsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(formFields).toString()
            });

            // Show success message
            showConfirmationMessage();

            // Close modal and reset form
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            bookingForm.reset();
        } catch (error) {
            console.error('Error submitting to Google Forms:', error);
            alert('Failed to submit your booking. Please contact support.');
        }
    }
    
    function showConfirmationMessage() {
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'confirmation-message';
        confirmationDiv.innerHTML = `
            <div class="confirmation-content">
                <i class="fas fa-check-circle"></i>
                <h3>Booking Confirmed!</h3>
                <p>Your slot has been successfully booked. You will receive a confirmation email shortly.</p>
                <button class="close-confirmation">Close</button>
            </div>
        `;
        document.body.appendChild(confirmationDiv);

        const closeConfirmationBtn = confirmationDiv.querySelector('.close-confirmation');
        closeConfirmationBtn.addEventListener('click', () => {
            document.body.removeChild(confirmationDiv);
        });
    }

    // Animation on Scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.step, .member, .stat, .price-card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial state for animated elements
    document.querySelectorAll('.step, .member, .stat, .price-card').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on page load
});