use std::os;

use actix_files as fs;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use postgres::{Client, NoTls};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(fs::Files::new("/assets", "./assets"))
            .route("/", web::get().to(greet))
            .route("/health", web::get().to(health))
    })
    .bind(("0.0.0.0", 666))?
    .run()
    .await
}

// This is not a health check
async fn health(_req: HttpRequest) -> impl Responder {
    HttpResponse::Ok()
}

async fn greet(_req: HttpRequest) -> impl Responder {
    let version = std::env::var("VERSION").unwrap_or("unknown".to_string());

    let sql =
        r#"SELECT * FROM quotes OFFSET floor(random() * (SELECT COUNT(*) FROM quotes)) LIMIT 1;"#;

    let mut client = match Client::connect(
        "host=postgres connect_timeout=2 user=postgres password=postgresql123 dbname=klustered",
        NoTls,
    ) {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::Ok().body(format!(
                r#"
                <html>
                <head>
                    <title>{} | Klustered</title>
                </head>
                <body>
                    <strong>Failed to connect to database</strong>
                    <p>{}</p>
                    <iframe src="https://giphy.com/embed/11tTNkNy1SdXGg" width="480" height="267" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/disneypixar-disney-pixar-11tTNkNy1SdXGg">via GIPHY</a></p>
                </body>
                </html>
        "#,
                version, e.to_string()
            ));
        }
    };

    let response  = match client.query(sql, &[]) {
        Ok(result) => {
            let row = result.first().unwrap();

            let quote: &str = row.get(0);
            let author: &str = row.get(1);
            let link: &str = row.get(2);

            HttpResponse::Ok().body(format!(
                r#"
                <html>
                <head>
                    <title>{} | Klustered</title>
                </head>
                <body>
                    <center>
                        <div style="font-size: 20px">
                            <strong>{}</strong> by <a target="_blank" href="{}">{}</a>
                        </div>
                        <video width="720" height="640" controls>
                            <source src="/assets/video-{}.webm" type="video/webm">
                        </video>
                    </center>
                </body>
                </html>
        "#, version, quote, link, author, version,
            ))
        }
        Err(e) => {

            HttpResponse::Ok().body(format!(
                r#"
                <html>
                <head>
                    <title>{} | Klustered</title>
                </head>
                <body>
                    <strong>Failed to query to database</strong>
                    <p>{}</p>
                    <iframe src="https://giphy.com/embed/FAYVdONl9am40nLz0o" width="480" height="360" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/BTTF-FAYVdONl9am40nLz0o">via GIPHY</a></p>
                </body>
                </html>
        "#, version, e.to_string(),
            ))
        }
    };

    client.close().unwrap();

    response
}
