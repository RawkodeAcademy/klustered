use actix_files as fs;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(fs::Files::new("/assets", "./assets"))
            .route("/", web::get().to(greet))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

async fn greet(_req: HttpRequest) -> impl Responder {
    HttpResponse::Ok().body(
        r#"
        <html>
        <head>
            <title>v1 | Klustered</title>
        </head>
        <body>
            <video width="1280" height="720" controls>
            <source src="/assets/video.mp4" type="video/mp4">
            </video>
        </body>
        </html>
"#,
    )
}
