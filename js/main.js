(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner(0);
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 45) {
            $('.navbar').addClass('sticky-top shadow-sm');
        } else {
            $('.navbar').removeClass('sticky-top shadow-sm');
        }
    });


    // Hero Header carousel
    $(".header-carousel").owlCarousel({
        animateOut: 'slideOutDown',
        items: 1,
        autoplay: true,
        smartSpeed: 1000,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
    });


    // International carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        items: 1,
        smartSpeed: 1500,
        dots: true,
        dotsData: true,
        loop: true,
        margin: 25,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ]
    });


    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });


    // testimonial carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        dots: true,
        loop: true,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
    });

    
    
   // Back to top button
   $(window).scroll(function () {
    if ($(this).scrollTop() > 300) {
        $('.back-to-top').fadeIn('slow');
    } else {
        $('.back-to-top').fadeOut('slow');
    }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    function myMove() {
        let id = null;
        const elem = document.getElementById("animate");   
        let pos = 0;
        clearInterval(id);
        id = setInterval(frame, 5);
        function frame() {
          if (pos == 350) {
            clearInterval(id);
          } else {
            pos++; 
            elem.style.top = pos + "px"; 
            elem.style.left = pos + "px"; 
          }
        }
      }

   


})(jQuery);

// Lightweight network node animation for hero
(function () {
    const canvas = document.getElementById('network-hero');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rootStyles = getComputedStyle(document.documentElement);
    const electric = rootStyles.getPropertyValue('--electric-blue').trim() || '#2DD4FF';
    const lime = rootStyles.getPropertyValue('--cyber-lime').trim() || '#9EFF00';
    const nodes = [];
    const edges = [];
    const NODE_COUNT = 28;
    const MAX_DIST = 260;

    function resize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function init() {
        nodes.length = 0;
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }
    init();

    function update() {
        edges.length = 0;
        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
            if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        }
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const d2 = dx * dx + dy * dy;
                if (d2 < MAX_DIST * MAX_DIST) {
                    edges.push({ a: nodes[i], b: nodes[j], dist2: d2 });
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, electric);
        grad.addColorStop(1, lime);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.9;

        for (const e of edges) {
            const alpha = 1 - Math.sqrt(e.dist2) / MAX_DIST;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(e.a.x, e.a.y);
            ctx.lineTo(e.b.x, e.b.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        for (const n of nodes) {
            n.pulse += 0.02;
            const r = 2 + Math.sin(n.pulse) * 1.2;
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 10);
            g.addColorStop(0, electric);
            g.addColorStop(1, 'rgba(45, 212, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    loop();
})();

